import { NextRequest, NextResponse } from 'next/server';
import { updateAgentSession, AgentSession } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    const allowedFields = ['status', 'result_summary', 'tokens_used'] as const;
    const updates: {
      status?: AgentSession['status'];
      result_summary?: string;
      tokens_used?: number;
    } = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Validate status if provided
    if (updates.status) {
      const validStatuses: AgentSession['status'][] = ['running', 'completed', 'failed', 'timeout'];
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json(
          { 
            error: 'Invalid status',
            valid_statuses: validStatuses
          },
          { status: 400 }
        );
      }
    }

    // Validate tokens_used if provided
    if (updates.tokens_used !== undefined) {
      if (typeof updates.tokens_used !== 'number' || updates.tokens_used < 0) {
        return NextResponse.json(
          { error: 'tokens_used must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updatedSession = await updateAgentSession(id, updates);
    
    return NextResponse.json(updatedSession);

  } catch (error) {
    console.error('Error updating agent session:', error);
    
    // Handle not found errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Agent session not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update agent session' },
      { status: 500 }
    );
  }
}