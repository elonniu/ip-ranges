import axios from "axios";
import {feishu} from "sst-helper";

export async function handle() {

    const ranges_url = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
    const {data} = await axios.get(ranges_url);

    const prefixes = data.prefixes;

    let ip_service: Record<string, number> = {};
    let ip_region: Record<string, number> = {};
    let prefix_num: Record<string, number> = {};
    let ip_sum = 0;

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
    }

    // order ip_num by value desc
    prefix_num = Object.fromEntries(Object.entries(prefix_num).sort(([, a], [, b]) => b - a));
    ip_service = Object.fromEntries(Object.entries(ip_service).sort(([, a], [, b]) => b - a));
    ip_region = Object.fromEntries(Object.entries(ip_region).sort(([, a], [, b]) => b - a));

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

    await feishu({
        ranges_url,
        ip_sum: ip_sum.toLocaleString('en-US'),
        prefix_num,
        ip_service,
        ip_region
    });

}
