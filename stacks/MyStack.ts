import {Function, StackContext, Table, Topic} from "sst/constructs";
import {ddbUrl, lambdaUrl} from "sst-helper";
import * as sns from "aws-cdk-lib/aws-sns";
import {StartingPosition} from "aws-cdk-lib/aws-lambda";
import {Duration} from "aws-cdk-lib";

export function API({stack, app}: StackContext) {

    // create sns topic by arn
    const topic = sns.Topic.fromTopicArn(
        stack,
        "AmazonIpSpaceChanged",
        "arn:aws:sns:us-east-1:806199016981:AmazonIpSpaceChanged"
    );

    const trigger = new Function(
        stack, 'Trigger',
        {
            runtime: 'nodejs18.x',
            handler: "packages/functions/src/ddb_trigger.handler",
            memorySize: 2048,
            timeout: 20,
            environment: {
                FEISHU_ID: process.env.FEISHU_ID || '',
            }
        });

    const table = new Table(stack, "IpRanges", {
        fields: {
            id: "string",
        },
        primaryIndex: {partitionKey: "id"},
        stream: "new_and_old_images",
        consumers: {
            consumer1: {
                cdk: {
                    eventSource: {
                        retryAttempts: 0,
                        startingPosition: StartingPosition.LATEST,
                        batchSize: 100,
                        maxBatchingWindow: Duration.seconds(5),
                    },
                },
                function: trigger,
            }
        },
    });

    trigger.bind([table]);

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
        lambda: lambdaUrl(fun.functionName, stack.region),
        table: ddbUrl(table.tableName, stack.region)
    });
}
