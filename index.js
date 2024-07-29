const fs = require("fs");
const pdf = require("pdf-parse");

const files = fs
  .readdirSync("./statements")
  .filter((file) => file.endsWith(".pdf"));

const formatter = new Intl.NumberFormat("es-MX", {
  useGrouping: false,
});

const PAYMENT_TYPES = ["Pago", "Retiro", "Comisión por éxito"];

const regex =
  /(\d{2}\/\d{2}\/\d{4})(Pago|Retiro|Comisión por éxito)([A-Za-z]{2,3}-\d+)(-?\$[\d,]+\.\d+)(-?\$[\d,]+\.\d+)/;

files.forEach((file) => {
  let parsedData = [];
  const dataBuffer = fs.readFileSync(`./statements/${file}`);
  pdf(dataBuffer).then(function (data) {
    data.text.split("\n").forEach((line) => {
      const match = line.match(regex);
      if (!match) return;
      let [, date, paymentType, , value] = match;
      value = Number(value.replace(/,/g, "").replace("$", ""));
      if (!date || !PAYMENT_TYPES.includes(paymentType)) return;
      let comision = 0;
      let pago = 0;
      let retiro = 0;
      if (paymentType === "Comisión por éxito") {
        comision = value;
      }
      if (paymentType === "Pago") {
        pago = value;
      }
      if (paymentType === "Retiro") {
        retiro = value;
      }
      if (parsedData[date]) {
        parsedData[date].comision += comision;
        parsedData[date].pago += pago;
        parsedData[date].retiro += retiro;
      } else {
        parsedData[date] = { comision, pago, retiro };
      }
    });
    parsedData = Object.keys(parsedData).map((key) => ({
      fecha: key,
      comision: formatter.format(parsedData[key].comision),
      pago: formatter.format(parsedData[key].pago),
      retiro: formatter.format(parsedData[key].retiro),
    }));
    parsedData = parsedData.filter(
      (item) => item.comision !== 0 || item.pago !== 0 || item.retiro !== 0
    );
    let fileString = "Fecha,Abono,Pago,Comision,Retiro\n";
    parsedData.forEach((item) => {
      fileString += `${item.fecha},,${item.pago},${item.comision},${item.retiro}\n`;
      /*fileString += `${item.fecha},,${item.pago},${
        item.comision < 0 ? Math.abs(item.comision) : item.comision
      },${item.retiro}\n`;*/
    });
    fs.writeFileSync(
      `./statements/${file.split(".")[0]}.csv`,
      fileString,
      "utf8"
    );
  });
});
