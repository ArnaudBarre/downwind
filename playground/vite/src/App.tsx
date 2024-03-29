import { useState } from "react";
import styles from "./app.module.css";

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div className={styles["container"]}>
      <h1 className={styles["title"]}>Vite + React</h1>
      <div className="p-4 text-lg">
        <button
          className="btn btn-green"
          onClick={() => setCount((v) => v + 1)}
        >
          count is <span className="tabular-nums">{count}</span>
        </button>
        <p className="mt-4">
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  );
};
