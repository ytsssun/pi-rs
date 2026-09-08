// Match the prepared-tool update barrier in pinned Pi agent-loop.ts.
// The plugin callback returns void; the host owns asynchronous sink completion.
export async function executeWithUpdates(tool,id,args,signal,emit) {
  const updates=[];
  let accepting=true;
  try {
    const result=await tool.execute(id,args,signal,update=>{
      if(!accepting)return;
      const pending=Promise.resolve(emit(update));
      // A plugin may run for a while after a sink rejects. Observe immediately
      // while retaining rejection for the completion barrier.
      pending.catch(()=>{});
      updates.push(pending);
    });
    accepting=false;
    await Promise.all(updates);
    return result;
  } catch(error) {
    accepting=false;
    await Promise.all(updates);
    throw error;
  } finally {
    accepting=false;
  }
}
