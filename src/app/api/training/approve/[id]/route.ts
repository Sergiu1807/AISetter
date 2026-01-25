// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (only manager+ can approve)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only managers and admins can approve training examples.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { action, notes } = body

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const exampleId = params.id

    // Get the training example
    const { data: example, error: fetchError } = await supabase
      .from('training_examples')
      .select('*')
      .eq('id', exampleId)
      .single()

    if (fetchError || !example) {
      return NextResponse.json(
        { error: 'Training example not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (example.status !== 'pending') {
      return NextResponse.json(
        { error: `Training example has already been ${example.status}` },
        { status: 400 }
      )
    }

    // Update training example
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updateData: {
      status: string;
      approved_by: string;
      approved_at: string;
      metadata?: Record<string, unknown>;
    } = {
      status: newStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }

    // Add notes to metadata if provided
    if (notes) {
      updateData.metadata = {
        ...(example.metadata || {}),
        reviewer_notes: notes
      }
    }

    const { data: updatedExample, error: updateError } = await supabase
      .from('training_examples')
      .update(updateData)
      .eq('id', exampleId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating training example:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create activity record
    const activityType = action === 'approve' ? 'training_example_approved' : 'training_example_rejected'
    const activityTitle = action === 'approve' ? 'Training Example Approved' : 'Training Example Rejected'
    const activityDescription = `${userData.full_name} ${action}ed a ${example.example_type} training example`

    await supabase.from('activities').insert({
      type: activityType,
      lead_id: null,
      user_id: user.id,
      title: activityTitle,
      description: activityDescription,
      metadata: {
        example_id: exampleId,
        example_type: example.example_type,
        action,
        reviewer: userData.full_name,
        reviewer_notes: notes || null,
        submitted_by: example.submitted_by
      }
    })

    // Notify submitter
    if (example.submitted_by && example.submitted_by !== user.id) {
      const notificationMessage = action === 'approve'
        ? `Your ${example.example_type} training example has been approved by ${userData.full_name}`
        : `Your ${example.example_type} training example was not approved${notes ? ': ' + notes : ''}`

      await supabase.from('notifications').insert({
        user_id: example.submitted_by,
        type: action === 'approve' ? 'training_approved' : 'training_rejected',
        title: activityTitle,
        message: notificationMessage,
        link: `/dashboard/training?example=${exampleId}`,
        metadata: {
          example_id: exampleId,
          example_type: example.example_type,
          action,
          reviewer: user.id,
          reviewer_name: userData.full_name,
          reviewer_notes: notes || null
        }
      })
    }

    return NextResponse.json({
      example: updatedExample,
      message: `Training example ${action}ed successfully`
    })
  } catch (error) {
    console.error('Error in training approve API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
