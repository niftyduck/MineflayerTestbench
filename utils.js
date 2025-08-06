function getArgs() {
  const args = process.argv.slice(2);
  let params = {};

  args.forEach(a => {
    const nameValue = a.split("=");
    params[nameValue[0]] = nameValue[1];
  });

  return params;
}


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export { getArgs, sleep };