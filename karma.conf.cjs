/*!
 * Copyright (c) 2020-2022 Digital Bazaar, Inc. All rights reserved.
 */
module.exports = config => {
  const browsers = ['ChromeHeadless'];
  const files = ['test/*.spec.js'];
  const frameworks = ['mocha'];
  const preprocessors = ['webpack', 'sourcemap'];
  const reporters = ['mocha'];
  const client = {
    mocha: {
      timeout: 2000
    }
  };

  return config.set({
    frameworks,
    files,
    reporters,
    port: 9876,
    colors: true,
    browsers,
    client,
    singleRun: true,
    preprocessors: {
      'test/*.js': preprocessors
    },
    webpack: {
      mode: 'development',
      devtool: 'inline-source-map'
    }
  });
};
