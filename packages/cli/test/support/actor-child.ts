// Prints the actor kind this process detects for itself, as a pod-factory command would.
import { currentContext, detectActorKind } from '../../src/index.js';

process.stdout.write(`ACTOR ${JSON.stringify(detectActorKind(currentContext()))}\n`);
