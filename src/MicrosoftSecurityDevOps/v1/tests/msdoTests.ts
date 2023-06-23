import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import { Inputs, CommandType } from '../common';


const conMapTestFile = path.join(__dirname, 'containerMappingMock.js');

describe('MicrosoftSecurityDevOps tests', function () {

    it('should process pre-job', function(done: Mocha.Done) {        
        process.env['INPUT_' + Inputs.CommandType] = CommandType.PreJob;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.stdOutContained('vso[task.setvariable variable=PREJOBSTARTTIME;'), true, "variale not set:" + tr.stdout);
        done();
    });

    it('should process post-job', function(done: Mocha.Done) {
        var curTime = new Date().toISOString();
        process.env['INPUT_' + Inputs.CommandType] = CommandType.PostJob;
        process.env['PREJOBSTARTTIME'] = curTime;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.stdOutContained('##vso[task.debug]PREJOBSTARTTIME='+curTime), true, "Task should have been processed: " + tr.stdout);
        done();
    });

    it('should always succeed', function(done: Mocha.Done) {
        process.env['INPUT_' + Inputs.CommandType] = 'RandomString';
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.stdOutContained('Error: Invalid task type'), true, "Task type should not be found" + tr.stdout);
        done();
    });

    it('should encode post-job output', function(done: Mocha.Done) {
        var curTime = new Date().toISOString();
        process.env['INPUT_' + Inputs.CommandType] = CommandType.PostJob;
        process.env['PREJOBSTARTTIME'] = curTime;
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(conMapTestFile);
        tr.run();
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.stdOutContained('U3VjY2VzcwpWZXJzaW9uOiAwLjEuMQo6OjpFdmVudHM6ClN1Y2Nlc3MKOjo6SW1hZ2VzOgpTdWNjZXNz'), true, "Output should have been encoded" + tr.stdout);
        done();
    });
});