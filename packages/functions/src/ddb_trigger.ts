import {feishu} from "sst-helper";
import {dynamoDb} from "../lib/ddb";
import {ranges_url, TableName} from "./lambda";
import AWS from "aws-sdk";
import {Topic} from "sst/node/topic";

const sns = new AWS.SNS();

export async function handler(event: any) {
    const {Records} = event;
    let update = {};

    for (const record of Records) {

        let {eventName, dynamodb: {NewImage, OldImage}} = record;

        NewImage = formatObj(NewImage);
        OldImage = formatObj(OldImage);

        // eventname: INSERT, MODIFY, REMOVE
        if (eventName === 'MODIFY') {
            update[OldImage.key + '_' + OldImage.name] = `${OldImage.value.toLocaleString('en-US')} -> ${NewImage.value.toLocaleString('en-US')} (${NewImage.value - OldImage.value})`;
        } else if (eventName === 'INSERT') {
            update[NewImage.key + '_' + NewImage.name] = NewImage.value.toLocaleString('en-US') + ' new';
        } else if (eventName === 'REMOVE') {
            update[OldImage.key + '_' + OldImage.name] = OldImage.value.toLocaleString('en-US') + ' remove';
        }
    }

    // get all data from  dynamodb
    const {Items} = await dynamoDb.scan({
        TableName,
    }).promise();

    //sort Item by value desc
    Items?.sort((a, b) => {
        const {value: value1} = a;
        const {value: value2} = b;
        return value2 - value1;
    });

    let obj: any = {};

    if (Items) {
        for (const item of Items) {
            const {name, key, value} = item;
            if (!obj[name]) {
                obj[name] = {};
            }
            obj[name][key] = value.toLocaleString('en-US');
        }

    }

    await feishu({
        update,
        ...obj
    });

    await sns.publish({
        TopicArn: Topic.Notification.topicArn,
        Message: JSON.stringify({
            ranges_url,
            update,
            ...obj
        }, null, 2)
    }).promise()

    return {};
}


function formatObj(obj: any) {
    if (obj === undefined) {
        return undefined;
    }
    return {
        name: obj.name.S,
        key: obj.key.S,
        value: obj.value.N,
    };
}
