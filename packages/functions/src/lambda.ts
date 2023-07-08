import axios from "axios";
import {feishu, jsonResponse} from "sst-helper";
import {DynamoDB} from "aws-sdk";
import {Table} from "sst/node/table";

const dynamoDb = new DynamoDB.DocumentClient();
const TableName = Table.IpRanges.tableName;

export async function handle() {

    const ranges_url = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
    const {data} = await axios.get(ranges_url);

    // get item from dynamodb
    const history = {
        TableName,
        Key: {
            id: 'ip_ranges'
        }
    }
    const {Item} = await dynamoDb.get(history).promise();

    const prefixes = data.prefixes;

    let ip_service: Record<string, number> = {};
    let ip_service_diff: Record<string, number> = {};

    let ip_region: Record<string, number> = {};
    let ip_region_diff: Record<string, number> = {};

    let prefix_num: Record<string, number> = {};
    let prefix_num_diff: Record<string, number> = {};

    let ip_sum = 0;
    let ip_sum_diff = 0;

    for (const prefix of prefixes) {
        prefix.service = prefix.service.toLowerCase();

        if (!ip_region[prefix.region]) {
            ip_region[prefix.region] = 0;
        }

        if (!ip_service[prefix.service]) {
            ip_service[prefix.service] = 0;
        }

        if (!prefix_num[prefix.region]) {
            prefix_num[prefix.region] = 0;
        }

        prefix_num[prefix.region]++;
        const [start, bitLength] = prefix.ip_prefix.split('/');
        const ipRange = Math.pow(2, 32 - parseInt(bitLength));
        ip_region[prefix.region] += ipRange;
        ip_service[prefix.service] += ipRange;
        ip_sum += ipRange;

        if (Item) {
            if (Item.ip_region[prefix.region]) {
                ip_region_diff[prefix.region] = Item.ip_region[prefix.region] - ip_region[prefix.region];
                ip_region_diff[prefix.region] === 0 && delete ip_region_diff[prefix.region];
            }
            if (Item.ip_service[prefix.service]) {
                ip_service_diff[prefix.service] = Item.ip_service[prefix.service] - ip_service[prefix.service];
                ip_service_diff[prefix.service] === 0 && delete ip_service_diff[prefix.service];
            }
            if (Item.prefix_num[prefix.region]) {
                prefix_num_diff[prefix.region] = Item.prefix_num[prefix.region] - prefix_num[prefix.region];
                prefix_num_diff[prefix.region] === 0 && delete prefix_num_diff[prefix.region];
            }
            ip_sum_diff = Item.ip_sum - ip_sum;
        }
    }

    // write to dynamodb
    const params = {
        TableName,
        Item: {
            id: 'ip_ranges',
            ip_service,
            ip_region,
            prefix_num,
            ip_sum
        }
    };
    await dynamoDb.put(params).promise();


    // order ip_num by value desc
    prefix_num = Object.fromEntries(Object.entries(prefix_num).sort(([, a], [, b]) => b - a));
    ip_service = Object.fromEntries(Object.entries(ip_service).sort(([, a], [, b]) => b - a));
    ip_region = Object.fromEntries(Object.entries(ip_region).sort(([, a], [, b]) => b - a));
    prefix_num_diff = Object.fromEntries(Object.entries(prefix_num).sort(([, a], [, b]) => b - a));
    ip_service_diff = Object.fromEntries(Object.entries(ip_service).sort(([, a], [, b]) => b - a));
    ip_region_diff = Object.fromEntries(Object.entries(ip_region).sort(([, a], [, b]) => b - a));

    //  Format the ip_service value number to thousands separator.
    for (const [key, value] of Object.entries(prefix_num)) {
        prefix_num[key] = value.toLocaleString('en-US');
    }

    for (const [key, value] of Object.entries(ip_service)) {
        ip_service[key] = value.toLocaleString('en-US');
    }

    for (const [key, value] of Object.entries(ip_region)) {
        ip_region[key] = value.toLocaleString('en-US');
    }

    const json = {
        ranges_url,

        ip_sum_diff: ip_sum_diff !== 0 ? ip_sum_diff.toLocaleString('en-US') : undefined,
        ip_region_diff: Object.keys(ip_region_diff) ? undefined : ip_region_diff,
        ip_service_diff: Object.keys(ip_service_diff) ? undefined : ip_service_diff,
        prefix_num_diff: Object.keys(prefix_num_diff) ? undefined : prefix_num_diff,

        ip_sum: ip_sum.toLocaleString('en-US'),
        ip_region,
        ip_service,
        prefix_num,
    };

    await feishu(json);

    return jsonResponse(json);

}
