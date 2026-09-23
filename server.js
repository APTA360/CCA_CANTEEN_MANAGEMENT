const { app } = require("./app");

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PRIT DA DHABA running on http://localhost:${PORT}`);
  });
} else {
  module.exports = require("./app");
}
