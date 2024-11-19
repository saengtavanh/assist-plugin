jQuery.noConflict();
(async function ($, Swal10, PLUGIN_ID) {
  let CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID).config;
  // const JP_CALENDAR = [
  //   ["1912-07-30", "T"],
  //   ["1926-12-25", "S"],
  //   ["1968-01-25", "M"],
  //   ["1989-01-08", "H"],
  //   ["2019-05-01", "R"],
  // ]

  if (!CONFIG) return;
  CONFIG = JSON.parse(kintone.plugin.app.getConfig(PLUGIN_ID).config);
  // console.log('CONFIG', CONFIG);

  function getAdjustedDate(offset) {
    const date = new Date(); // today's date
    date.setDate(date.getDate() + offset); // adjust date by offset

    // Format the date to "YYYY-MM-DD"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    console.log('month', month);
    const day = String(date.getDate()).padStart(2, '0');
    console.log('day', day);

    return `${year}-${month}-${day}`;
  }

  kintone.events.on(["app.record.edit.show", "app.record.create.show"], async (event) => {
    console.log(event);
    console.log(CONFIG);
    let record = event.record;
    for (const item of CONFIG.formatSetting) {
      if (item.space == "-----") continue;
      let spaceElement = kintone.app.record.getSpaceElement(item.space);
      // kintone.app.record.setFieldShown(item.storeField.code, false);
      // let defaultDate = item.initialValue == "" ? "" : item.initialValue == "1" ? getAdjustedDate(1) : item.initialValue == "-1" ? getAdjustedDate(-1) : item.initialValue == "0" ? getAdjustedDate(0) : "";
      let defaultDate = "";
      switch (item.initialValue) {
        case "1":
          defaultDate = getAdjustedDate(1);
          break;

        case "10":
          defaultDate = getAdjustedDate(10);
          break;

        case "0":
          defaultDate = getAdjustedDate(0);
          break;

        case "-1":
          defaultDate = getAdjustedDate(-1);
          break;

        case "-10":
          defaultDate = getAdjustedDate(-10);
          break;

        default:
          defaultDate = "";
          break;
      }
      record[item.storeField.code].value = defaultDate;
      const datePicker = new Kuc.Text({
        // label: 'Fruit',
        // requiredIcon: true,
        value: defaultDate,
        // placeholder: 'Apple',
        textAlign: 'left',
        // error: 'Error occurred!',
        className: 'options-class',
        id: 'options-id',
        visible: true,
        disabled: false
      });
      $(datePicker).on('change', async (e) => {
        console.log(e.target.value);
        // await setRecord(item.storeField.code, e.target.value);
      })
      console.log('spaceElement', spaceElement);
      $(spaceElement).append(
        $("<div>").addClass("control-gaia").append(
          $("<div>").addClass("control-label-gaia").append($("<span>").addClass("control-label-text-gaia").text(item.storeField.label)),
          datePicker
        )
      )

    }

    async function setRecord(fieldCode, value) {
      let rec = kintone.app.record.get();
      console.log(rec);
      rec.record[fieldCode].value = value
      kintone.app.record.set(rec);
      return event;
    }

    return event;
  }
  );

  function getFieldData(data, fieldCode) {
    // Search in fieldList
    for (const key in data.table.fieldList) {
      if (data.table.fieldList[key].var === fieldCode) {
        return data.table.fieldList[key];
      }
    }
    // Search in subTable
    for (const subKey in data.subTable) {
      for (const key in data.subTable[subKey].fieldList) {
        if (data.subTable[subKey].fieldList[key].var === fieldCode) {
          return data.subTable[subKey].fieldList[key];
        }
      }
    }
    return null; // Return null if not found
  }

  // Function to determine the Japanese era symbol and custom year
  function getJapaneseEra(date) {
    const JP_CALENDAR = window.BoK.Constant.JpCalenderBase;
    console.log('JP_CALENDAR', JP_CALENDAR);

    let eraSymbol = "";
    let eraStartYear = 0;
    let eraStartDate = null;

    // Loop through the calendar array to find the correct era
    for (let i = JP_CALENDAR.length - 1; i >= 0; i--) {
      const startDateStr = JP_CALENDAR[i][0]; // The start date of the era
      const symbol = JP_CALENDAR[i][2];      // The era symbol (e.g., "R")
      const startDate = new Date(startDateStr); // The date object for the start date

      // If the given date is on or after this era start date
      if (date >= startDate) {
        eraSymbol = symbol;
        eraStartDate = startDate;
        eraStartYear = date.getFullYear() - startDate.getFullYear(); // Difference in years

        // If the given date is before the start of the era, reset customYear to 1
        if (date.getMonth() < startDate.getMonth() || (date.getMonth() === startDate.getMonth() && date.getDate() < startDate.getDate())) {
          eraStartYear = 0;
        }
        eraStartYear += 1;  // Start year should be 1 for the first year of the era
        break;
      }
    }

    if (!eraSymbol) {
      return { error: 'Era not found for the given date' };
    }

    // Format era year with two digits, e.g., "01" for the first year of the era
    const customYear = String(eraStartYear).padStart(2, '0');

    // Format the date to "YYYY-MM-DD"
    const eraYear = date.getFullYear();
    const eraMonth = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-based
    const eraDay = String(date.getDate()).padStart(2, '0');

    const formattedDate = `${eraYear}-${eraMonth}-${eraDay}`;

    return { eraSymbol, customYear, formattedDate };
  }

  kintone.events.on("app.record.detail.show", async (event) => {
    console.log(CONFIG);
    // Example usage:
    const testDate1 = new Date("2019-05-01");  // Example 1
    const testDate2 = new Date("2020-04-30");  // Example 2
    const testDate3 = new Date("2020-05-01");  // Example 3

    console.log(getJapaneseEra(testDate1)); // R1 05 01 => 2019-05-01
    console.log(getJapaneseEra(testDate2)); // R1 04 30 => 2020-04-30
    console.log(getJapaneseEra(testDate3)); // R2 05 01 => 2020-05-01
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
    let record = event.record;

    for (const item of CONFIG.formatSetting) {
      let formatDate;
      let field = getFieldData(schemaPage, item.storeField.code);
      if (item.space != "-----") {
        let spaceElement = kintone.app.record.getSpaceElement(item.space);
        console.log(spaceElement);
        $(spaceElement).parent().remove();
      }
      // Create a Date object
      const dateValue = record[item.storeField.code].value;
      if(!dateValue) continue;
      const date = new Date(dateValue);

      // Get era symbol and custom year
      const { eraSymbol, customYear } = getJapaneseEra(date);
      const referenceDate = new Date("2019-05-01");

      // Extract parts of the date
      const yearFull = date.getFullYear(); // 2024
      const month = String(date.getMonth() + 1).padStart(2, '0'); // 10
      const day = String(date.getDate()).padStart(2, '0'); // 30
      const yearShort = String(yearFull).slice(2); // 24

      switch (item.format) {
        case "YYYY-MM-DD":
          formatDate = `${yearFull}-${month}-${day}`;
          break;

        case "YYYY/MM/DD":
          formatDate = `${yearFull}/${month}/${day}`;
          break;
        case "YYYY.MM.DD":
          formatDate = `${yearFull}.${month}.${day}`;
          break;

        case "YY/MM/DD":
          formatDate = `${yearShort}/${month}/${day}`;
          break;
        case "YY.MM.DD":
          formatDate = `${yearShort}.${month}.${day}`;
          break;
        case "eYY.MM.DD":
          formatDate = `${eraSymbol}${customYear}.${month}.${day}`;
          break;
        case "e_YY_MM_DD":
          formatDate = `${eraSymbol} ${customYear} ${month} ${day}`;
          break;

        default:
          break;
      }
      if (formatDate) $(`.value-${field.id}`).find("span").text(formatDate);

    }

    return event;
  }
  );

  kintone.events.on("app.record.index.show", async (event) => {
    const schemaPage = cybozu.data.page.SCHEMA_DATA;

    for (const item of CONFIG.formatSetting) {
      let data = getFieldData(schemaPage, item.storeField.code);
      let fields = $(`.value-${data.id}`);

      // Create a Date object
      for (const field of fields) {
        let formatDate;
        const dateValue = $(field).find("span").text();
        const date = new Date(dateValue);

        // Get era symbol and custom year
        const { eraSymbol, customYear } = getJapaneseEra(date);

        // Extract parts of the date
        const yearFull = date.getFullYear(); // 2024
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 10
        const day = String(date.getDate()).padStart(2, '0'); // 30
        const yearShort = String(yearFull).slice(2); // 24

        switch (String(item.format)) {
          case "YYYY-MM-DD":
            formatDate = `${yearFull}-${month}-${day}`;
            break;

          case "YYYY/MM/DD":
            formatDate = `${yearFull}/${month}/${day}`;
            break;
          case "YYYY.MM.DD":
            formatDate = `${yearFull}.${month}.${day}`;
            break;

          case "YY/MM/DD":
            formatDate = `${yearShort}/${month}/${day}`;
            break;
          case "YY.MM.DD":
            formatDate = `${yearShort}.${month}.${day}`;
            break;
          case "eYY.MM.DD":
            formatDate = `${eraSymbol}${customYear}.${month}.${day}`;
            break;
          case "e_YY_MM_DD":
            formatDate = `${eraSymbol} ${customYear} ${month} ${day}`;
            break;

          default:
            console.log("No matching format:", item.format);
            break;
        }
        console.log('formatDate', formatDate);
        if (formatDate) $(field).find("span").text(formatDate);
      }

    }
    return event;
  }
  );
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);
