function getArgs(): any {
  if (!process.argv){
    return {};
  }
  
  const args: string[] = process.argv.slice(2);
  let params: any = {};

  args.forEach(a => {
    const nameValue: string[] = a.split("=");
    const key: string = nameValue?.[0] || "";
    if (nameValue?.length < 2){
      params[key] = true;
      return
    }
    params[key] = nameValue?.[1];
  });

  return params;
}

export { getArgs };