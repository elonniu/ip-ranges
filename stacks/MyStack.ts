import {Function, StackContext, Table, Topic} from "sst/constructs";
import {ddbUrl, lambdaUrl} from "sst-helper";
import * as sns from "aws-cdk-lib/aws-sns";

export function API({stack, app}: StackContext) {

    // create sns topic by arn
    const topic = sns.Topic.fromTopicArn(
        stack,
        "AmazonIpSpaceChanged",
        "arn:aws:sns:us-east-1:806199016981:AmazonIpSpaceChanged"
    );

    const table = new Table(stack, "IpRanges", {
        fields: {
            id: "string",
        },
        primaryIndex: {partitionKey: "id"},
    });

    const fun = new Function(stack, 'Function',
        {
            runtime: 'nodejs18.x',
            handler: "packages/functions/src/lambda.handle",
            memorySize: 2048,
            timeout: 30,
            bind: [table],
            environment: {
                FEISHU_ID: process.env.FEISHU_ID || '',
            }
        });

    !app.local && new Topic(stack, "Topic", {
        subscribers: {
            subscriber1: fun,
        },
        cdk: {
            topic,
        },
    });

    stack.addOutputs({
        lambdaUrl: lambdaUrl(fun.functionName, stack.region),
        table: ddbUrl(table.tableName, stack.region)
    });
}
