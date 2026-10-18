import { Composition } from "remotion";
import { Film, DUR } from "./Film";
import { TL } from "./util";

export const Root = () => (
  <Composition id="Film" component={Film} durationInFrames={DUR} fps={TL.fps} width={1920} height={1080} />
);
