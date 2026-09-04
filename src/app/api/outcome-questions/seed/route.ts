import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Your v1 outcomes framework, transcribed exactly from "Outcomes areas.xlsx".
// Only the self-harm question is marked sensitive for now — the flagging
// hook exists, but automatic detection stays off for the rest until the
// safeguarding process (who gets notified, how) is confirmed.
const QUESTIONS: {
  area_code: string; area_label: string; question_text: string;
  is_sensitive?: boolean; concerning_direction?: 'high' | 'low'; concerning_threshold?: number;
}[] = [
  { area_code: 'Safety', area_label: 'Safety', question_text: 'I feel safe in my home' },
  { area_code: 'Safety', area_label: 'Safety', question_text: 'I feel safe in public' },
  { area_code: 'Safety', area_label: 'Safety', question_text: 'I have housing sufficient for my needs' },
  { area_code: 'Safety', area_label: 'Safety', question_text: 'My overall physical health is satisfactory' },
  { area_code: 'Safety', area_label: 'Safety', question_text: 'I have no legal risks in my life' },
  { area_code: 'Safety', area_label: 'Safety', question_text: 'My place of work feels safe' },
  { area_code: 'Safety', area_label: 'Safety', question_text: 'Being inside of BR seems to be a safe place to be' },

  { area_code: 'MH', area_label: 'Mental Health', question_text: 'Addictions I experience are not negatively impacting my life at the moment' },
  { area_code: 'MH', area_label: 'Mental Health', question_text: 'My overall mental health is not negatively affecting my life at the moment' },
  { area_code: 'MH', area_label: 'Mental Health', question_text: 'I am experiencing increased symptoms of anxiety at the moment to the point where it is negatively impacting my normal life' },
  { area_code: 'MH', area_label: 'Mental Health', question_text: 'I am experiencing increased symptoms of depression at the moment to the point where it is negatively impacting my normal life' },
  { area_code: 'MH', area_label: 'Mental Health', question_text: 'I am experiencing increased symptoms of neuro-diversity at the moment to the point where it is negatively impacting my normal life' },
  { area_code: 'MH', area_label: 'Mental Health', question_text: 'I am experiencing increased symptoms of trauma at the moment to the point where it is negatively impacting my normal life' },
  { area_code: 'MH', area_label: 'Mental Health', question_text: 'I have had negative thoughts around self harm in the last 2 weeks', is_sensitive: true, concerning_direction: 'high', concerning_threshold: 4 },

  { area_code: 'WB', area_label: 'Wellbeing', question_text: 'I am experiencing unacceptable levels of loneliness at the moment to the point where it affects my happiness and clouds my life' },
  { area_code: 'WB', area_label: 'Wellbeing', question_text: 'I am experiencing unacceptable levels of low mood at the moment to the point where it affects my happiness and clouds my life' },
  { area_code: 'WB', area_label: 'Wellbeing', question_text: 'I am experiencing increasing levels of confidence' },
  { area_code: 'WB', area_label: 'Wellbeing', question_text: 'I am comfortable with my levels of gender expression at the moment' },
  { area_code: 'WB', area_label: 'Wellbeing', question_text: 'I think I am living a worthwhile life' },
  { area_code: 'WB', area_label: 'Wellbeing', question_text: 'I have a plan to move forward with any gender changes within the constraints of the external world' },

  { area_code: 'Rels', area_label: 'Relationships', question_text: 'My family relationships are working positively for me at the moment' },
  { area_code: 'Rels', area_label: 'Relationships', question_text: 'I feel safe and valued in my family relationships' },
  { area_code: 'Rels', area_label: 'Relationships', question_text: 'I feel safe and valued in my work relationships' },

  { area_code: 'GA', area_label: 'Goal Achievement', question_text: 'I have a plan for my gender changes I can affect' },
  { area_code: 'GA', area_label: 'Goal Achievement', question_text: 'I have a plan for life I can affect' },
  { area_code: 'GA', area_label: 'Goal Achievement', question_text: 'I have the right level of support to achieve my plan' },
  { area_code: 'GA', area_label: 'Goal Achievement', question_text: 'I have the skills I need to move my plan forward' },
  { area_code: 'GA', area_label: 'Goal Achievement', question_text: 'I am responsible for the choices I am making given the constraints that affect me' },

  { area_code: 'Opp', area_label: 'Opportunity', question_text: 'I am hopeful about the future' },
  { area_code: 'Opp', area_label: 'Opportunity', question_text: "It's up to me what I choose to do and think" },
  { area_code: 'Opp', area_label: 'Opportunity', question_text: 'My destiny is in my own hands' },
  { area_code: 'Opp', area_label: 'Opportunity', question_text: 'I intend to live my life in a way I desire' },

  { area_code: 'Satisfied', area_label: 'Satisfaction', question_text: 'I would recommend BR to others' },
  { area_code: 'Satisfied', area_label: 'Satisfaction', question_text: 'I am satisfied with what BR currently provides' },
  { area_code: 'Satisfied', area_label: 'Satisfaction', question_text: 'I have things I would suggest that BR could do - or differently overall and for me' },
  { area_code: 'Satisfied', area_label: 'Satisfaction', question_text: 'The support I receive makes a difference to my life' },

  { area_code: 'WW', area_label: 'Waiting Well', question_text: 'I understand the challenges in waiting' },
  { area_code: 'WW', area_label: 'Waiting Well', question_text: 'I have a plan based on what I need to do in life' },
  { area_code: 'WW', area_label: 'Waiting Well', question_text: 'I have a plan and a plan B in case of challenges in the future' },

  { area_code: 'Res', area_label: 'Resilience', question_text: 'What I think and do is my choice' },
  { area_code: 'Res', area_label: 'Resilience', question_text: 'I am unduly concerned with what others think about me' },
  { area_code: 'Res', area_label: 'Resilience', question_text: 'I have ways to manage my energy' },
  { area_code: 'Res', area_label: 'Resilience', question_text: 'I would prefer to be liked than respected' },
  { area_code: 'Res', area_label: 'Resilience', question_text: 'I enjoy bouncing back from setbacks' },
  { area_code: 'Res', area_label: 'Resilience', question_text: 'I feel energised by pressure and/or challenge' },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 })

  const { organisation_id } = await req.json()
  if (!organisation_id) return NextResponse.json({ error: 'organisation_id required' }, { status: 400 })

  const { count } = await supabase
    .from('outcome_questions').select('id', { count: 'exact', head: true }).eq('organisation_id', organisation_id)

  if (count && count > 0) {
    return NextResponse.json({ error: 'This organisation already has an outcome question set — delete existing questions first if you want to reseed.' }, { status: 409 })
  }

  const rows = QUESTIONS.map((q, i) => ({ ...q, organisation_id, sort_order: i }))
  const { data, error } = await supabase.from('outcome_questions').insert(rows).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
