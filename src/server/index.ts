/**
 * Server module exports
 */
export {
  type MCPServerConfig,
  type MidnightConfig,
  type NextJSConfig,
  type StdioServerConfig,
  type HttpServerConfig,
  DefaultServerConfig,
  DefaultMidnightConfig,
  DefaultNextJSConfig,
  mergeConfig,
  validateConfig,
  configFromEnv,
  configFromArgs,
  resolveConfig,
} from "./config.js"

export {
  type ServerState,
  type ServerDependencies,
  createMCPServer,
  runStdioServer,
  main,
} from "./server.js"
