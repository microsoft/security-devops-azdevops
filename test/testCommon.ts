import * as path from 'path';

export const configuration = process.env.configuration || 'debug';

export const stagingDirectory = path.join(__dirname, '..', 'lib', configuration);