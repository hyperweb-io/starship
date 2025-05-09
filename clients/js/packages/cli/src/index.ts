#!/usr/bin/env node
import { StarshipClient, StarshipInstaller } from '@starship-ci/client'; // Adjust the import path as necessary
import { Inquirerer, type Question } from 'inquirerer';
import minimist from 'minimist';

import {
  displayUsage,
  displayVersion,
  loadConfig,
  params,
  usageText
} from './utils';

const argv = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

if (!('tty' in argv)) {
  argv.tty = true;
}

if (argv.version) {
  displayVersion();
  process.exit(0);
}

const prompter = new Inquirerer({
  noTty: !argv.tty
});

const questions: Question[] = params.map((name) => ({ name, type: 'text' }));

// Filter questions based on the command
function getQuestionsForCommand(command: string): Question[] {
  const commonQuestions = questions.filter((q) => q.name !== 'config');
  if (['start', 'deploy', 'start-ports', 'wait-for-pods'].includes(command)) {
    return questions; // Include all questions, including config
  } else {
    return commonQuestions; // Exclude config
  }
}

// Main function to run the application
async function main() {
  const command: string = argv._[0];

  // Display usage and exit early if no command or help command is provided
  if (!command || command === 'help') {
    displayUsage();
    prompter.close();
    return;
  }

  // Load configuration and prompt for missing parameters
  const config = loadConfig(argv);
  const commandQuestions = getQuestionsForCommand(command);
  const args = await prompter.prompt({ ...config.context }, commandQuestions, {
    usageText
  });

  const client = new StarshipClient(args);
  client.setConfig(config.starship);

  const installer = new StarshipInstaller();

  // Execute command based on input
  switch (command) {
    case 'install':
      installer.checkAndInstallDependencies().catch((err: any) => {
        console.error('An error occurred during start:', err);
        process.exit(1);
      });
      break;
    case 'start':
      client.start().catch((err: any) => {
        console.error('An error occurred during start:', err);
        process.exit(1);
      });
      break;
    case 'deploy':
      client.deploy();
      break;
    case 'setup':
      client.setup();
      break;
    case 'start-ports':
      client.startPortForward();
      break;
    case 'get-pods':
      client.getPods();
      break;
    case 'wait-for-pods':
      client.waitForPods().catch((err: any) => {
        console.error('An error occurred during wait-for-pods:', err);
        process.exit(1);
      });
      break;
    case 'port-pids':
      client.printForwardPids();
      break;
    case 'stop-ports':
      client.stopPortForward();
      break;
    case 'stop':
      client.stop().catch((err: any) => {
        console.error('An error occurred during stop:', err);
        process.exit(1);
      });
      break;
    case 'undeploy':
      client.deleteHelm();
      break;
    case 'verify':
      client.verify().catch((err: any) => {
        console.error('An error occurred during verification:', err);
        process.exit(1);
      });
      break;
    default:
      console.log(`Unknown command: ${command}`);
      displayUsage();
  }

  prompter.close();
}

// Improved error handling
main().catch((err) => {
  console.error('An error occurred:', err);
  prompter.close();
  process.exit(1);
});
