import axios from "axios";
import {feishu} from "sst-helper";

export async function handle() {

    const ranges = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
    const {data} = await axios.get(ranges);

    const prefixes = data.prefixes;

    let ip_num: Record<string, number> = {};
    let prefix_num: Record<string, number> = {};

    for (const prefix of prefixes) {

        if (!ip_num[prefix.region]) {
            ip_num[prefix.region] = 0;
        }

        if (!prefix_num[prefix.region]) {
            prefix_num[prefix.region] = 0;
        }

        prefix_num[prefix.region]++;
        const [start, bitLength] = prefix.ip_prefix.split('/');
        const ipRange = Math.pow(2, 32 - parseInt(bitLength));
        ip_num[prefix.region] += ipRange;
    }

    // order ip_num by value desc
    prefix_num = Object.fromEntries(Object.entries(prefix_num).sort(([, a], [, b]) => b - a));
    ip_num = Object.fromEntries(Object.entries(ip_num).sort(([, a], [, b]) => b - a));

    await feishu({
        ranges,
        prefix_num,
        ip_num
    });

}
