import axios from "axios";
import {jsonResponse} from "sst-helper";
import {Table} from "sst/node/table";
import {batchPut} from "../lib/ddb";

export const TableName = Table.IpRanges.tableName;

export interface Count {
    id?: string,
    name: string,
    key: string,
    value: number,
}

export const ranges_url = 'https://ip-ranges.amazonaws.com/ip-ranges.json';

export async function handle() {

    const {data} = await axios.get(ranges_url);

    const prefixes = data.prefixes;

    let service_ip: Record<string, number> = {};

    let region_ip: Record<string, number> = {};

    let region_prefix: Record<string, number> = {};

    let ip_sum = 0;

    for (const prefix of prefixes) {
        const {service, region} = prefix;

        if (!region_ip[region]) {
            region_ip[region] = 0;
        }

        if (!service_ip[service]) {
            service_ip[service] = 0;
        }

        if (!region_prefix[region]) {
            region_prefix[region] = 0;
        }

        region_prefix[region]++;
        const [start, bitLength] = prefix.ip_prefix.split('/');
        const ipRange = Math.pow(2, 32 - parseInt(bitLength));
        region_ip[region] += ipRange;
        service_ip[service] += ipRange;
        ip_sum += ipRange;
    }

    let list: Count[] = [];

    //  Format the ip_service value number to thousands separator.
    for (const [key, value] of Object.entries(region_prefix)) {
        list.push({
            name: "prefix",
            key,
            value
        });
    }

    for (const [key, value] of Object.entries(service_ip)) {
        list.push({
            name: "service",
            key,
            value
        });
    }

    for (const [key, value] of Object.entries(region_ip)) {
        list.push({
            name: "region",
            key,
            value
        });
    }

    list.push({
        name: "sum",
        key: "ip",
        value: ip_sum
    });

    // foreach list
    for (const item of list) {
        item.id = item.name + '_' + item.key;
    }

    await batchPut(TableName, list);

    const json = {
        ranges_url,
        ip_sum: ip_sum.toLocaleString('en-US'),
        ip_region: region_ip,
        ip_service: service_ip,
        prefix_num: region_prefix,
    };

    return jsonResponse(json);

}
