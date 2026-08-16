module.exports = {
  webpack: function override(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      path: require.resolve("path-browserify"),
      fs: false,
      url: require.resolve("url/"),
    };
    return config;
  },
  devServer: function (configFunction) {
    return function (proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);
      config.client = {
        ...config.client,
        webSocketURL: {
          hostname: "localhost",
          pathname: "/ws",
          port: 3000,
        },
        overlay: false,
      };
      return config;
    };
  },
};
