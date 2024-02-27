export const intervalCheck = <T>(ms: number, getValue: () => T) => {
  let utilsResolved = false;
  let scanHappenedOnce = false;
  let scanHappened = false;

  const timoutId = setTimeout(() => {
    if (!scanHappenedOnce) throw new Error("No file to scan");
  }, 5_000);

  return {
    promise: new Promise<T>((resolve) => {
      const intervalId = setInterval(() => {
        if (!scanHappenedOnce) return;
        if (scanHappened) {
          scanHappened = false;
        } else {
          resolve(getValue());
          utilsResolved = true;
          clearInterval(intervalId);
        }
      }, ms);
    }),
    taskRunning: () => {
      if (utilsResolved) throw new Error("Utils are already resolved");
      scanHappenedOnce = true;
      scanHappened = true;
    },
    clean: () => {
      if (!utilsResolved) throw new Error("Build ended without utils");
      clearTimeout(timoutId);
    },
  };
};
