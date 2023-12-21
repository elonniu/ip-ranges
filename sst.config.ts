import {SSTConfig} from "sst";
import {API} from "./stacks/MyStack";
import {RemovalPolicy} from "aws-cdk-lib";

export default {
  config(_input) {
    return {
      name: "ip-ranges",
      region: "ap-northeast-1",
    };
  },
  stacks(app) {
    app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
    app.stack(API);
  }
} satisfies SSTConfig;
