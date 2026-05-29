export async function getAnalysisService({ supabaseAdmin, id, user, isAdminUser, mapAnalysisRowToApi }) {
  const isAdmin = isAdminUser(user);
  let query = supabaseAdmin.from('analysis_history').select('*').eq('id', id);
  if (!isAdmin) query = query.eq('user_id', user.id);
  const { data, error } = await query.single();
  if (error || !data) return null;
  return mapAnalysisRowToApi(data);
}
