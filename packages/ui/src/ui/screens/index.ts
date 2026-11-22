import type { Context, Route, Screen } from '../screen';
import { buildScreen } from './build';
import { checkinScreen } from './checkin';
import { chooseScreen } from './choose';
import { continueScreen } from './continue';
import { finishedScreen } from './finished';
import { graduateScreen } from './graduate';
import { homeScreen } from './home';
import { importScreen } from './import';
import { quickScreen } from './quick';
import { journeyScreen } from './journey';
import { momentScreen } from './moment';
import { motivatesScreen } from './motivates';
import { pickTaskScreen } from './pick-task';
import { placeScreen } from './place';
import { planCheckScreen } from './plan-check';
import { previewScreen } from './preview';
import { settingsScreen } from './settings';
import { setupScreen } from './setup';
import { shelfScreen } from './shelf';
import { smallerScreen } from './smaller';
import { startScreen } from './start';
import { stationsScreen } from './stations';
import { stationScreen } from './station';
import { stillScreen } from './still';
import { welcomeScreen } from './welcome';

/** The screen for a route (docs/behaviour.md, screens). */
export const screenFor = (route: Route, ctx: Context): Screen => {
  switch (route.name) {
    case 'welcome':
      return welcomeScreen(ctx);
    case 'home':
      return homeScreen(ctx);
    case 'journey':
      return journeyScreen(ctx);
    case 'place':
      return placeScreen(ctx, route.anchorId);
    case 'moment':
      return momentScreen(ctx, route.anchorId, route.journeyId);
    case 'choose':
      return chooseScreen(ctx, route.anchorId);
    case 'preview':
      return previewScreen(ctx, route.journeyId, route.anchorId);
    case 'quick':
      return quickScreen(ctx, route.step, route.answers, route.anchorId);
    case 'import':
      return importScreen(ctx, route.file, route.kept, route.anchorId);
    case 'settings':
      return settingsScreen(ctx);
    case 'station':
      return stationScreen(ctx, route.index);
    case 'start':
      return startScreen(ctx, route.journeyId, route.anchorId);
    case 'setup':
      return setupScreen(ctx, route.runId);
    case 'pick-task':
      return pickTaskScreen(ctx, route.runId);
    case 'continue':
      return continueScreen(ctx);
    case 'smaller':
      return smallerScreen(ctx);
    case 'finished':
      return finishedScreen(ctx, route.journeyId);
    case 'checkin':
      return checkinScreen(ctx, route.runId);
    case 'graduate':
      return graduateScreen(ctx, route.runId);
    case 'still':
      return stillScreen(ctx, route.runId);
    case 'shelf':
      return shelfScreen(ctx);
    case 'motivates':
      return motivatesScreen();
    case 'build':
      return buildScreen(ctx);
    case 'plan-check':
      return planCheckScreen(ctx);
    case 'stations':
      return stationsScreen(ctx);
  }
};
