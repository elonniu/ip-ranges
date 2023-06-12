import {Function, StackContext, Topic} from "sst/constructs";
import {lambdaUrl} from "sst-helper";
import * as sns from "aws-cdk-lib/aws-sns";

export function API({stack, app}: StackContext) {

    // create sns topic by arn
    const topic = sns.Topic.fromTopicArn(stack, "AmazonIpSpaceChanged", "arn:aws:sns:us-east-1:806199016981:AmazonIpSpaceChanged");

    const fun = new Function(
        stack, 'Function',
        {
            runtime: 'nodejs18.x',
            handler: "packages/functions/src/lambda.handle",
            memorySize: 4028,
            timeout: 30,
            environment: {
                FEISHU_ID: process.env.FEISHU_ID || '',
            }
        });

    new Topic(stack, "Topic", {
        subscribers: {
            subscriber1: fun,
        },
        cdk: {
            topic,
        },
    });

    stack.addOutputs({
        lambdaUrl: lambdaUrl(fun, app)
    });
}
