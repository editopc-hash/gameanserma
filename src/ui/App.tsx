import { css } from "@emotion/react";
import { GameView } from "../game/GameView";

function App() {
  return (
    <div css={css({ height: "100%", width: "100%" })}>
      <GameView />
    </div>
  );
}

export default App;
