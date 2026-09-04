import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function isConcerning(
  score: number,
  question: { is_sensitive: boolean; concerning_direction: 'high' | 'low' | null; concerning_threshold: number | null }
) {
  if (!question.is_sensitive || !question.concerning_direction) return false
  const threshold = question.concerning_threshold ?? 6
  return question.concerning_direction === 'high' ? score >= threshold : score <= threshold
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { project_id, respondent_ref, checkin_date, answers } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'At least one answer is required' }, { status: 400 })
  }

  const { data: project } = await supabase.from('projects').select('organisation_id').eq('id', project_id).single()
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const questionIds = answers.map((a: any) => a.question_id)
  const { data: questions } = await supabase
    .from('outcome_questions').select('id, is_sensitive, concerning_direction, concerning_threshold')
    .in('id', questionIds)
  const questionMap = new Map((questions ?? []).map(q => [q.id, q]))

  let anyFlagged = false
  const answerRows = answers.map((a: any) => {
    const q = questionMap.get(a.question_id)
    const flagged = q ? isConcerning(Number(a.score), q) : false
    if (flagged) anyFlagged = true
    return {
      question_id: a.question_id,
      score: Number(a.score),
      trend: a.trend || null,
      reason: a.reason?.trim() || null,
      is_flagged: flagged,
    }
  })

  const { data: checkin, error: checkinError } = await supabase
    .from('outcome_checkins')
    .insert({
      project_id,
      organisation_id: project.organisation_id,
      respondent_ref: respondent_ref?.trim() || null,
      checkin_date: checkin_date || new Date().toISOString().split('T')[0],
      submitted_by: user.id,
      has_flag: anyFlagged,
    })
    .select()
    .single()

  if (checkinError) return NextResponse.json({ error: checkinError.message }, { status: 500 })

  const { error: answersError } = await supabase
    .from('outcome_answers')
    .insert(answerRows.map(a => ({ ...a, checkin_id: checkin.id })))

  if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 })

  return NextResponse.json({ data: { ...checkin, flagged: anyFlagged } }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('outcome_checkins').select('*').eq('project_id', projectId).order('checkin_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
