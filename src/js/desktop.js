jQuery.noConflict();
(async function ($, Swal10, PLUGIN_ID) {
  let CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID).config;
  const JP_CALENDAR = [
    ["1912-07-30", "T"],
    ["1926-12-25", "S"],
    ["1968-01-25", "M"],
    ["1989-01-08", "H"],
    ["2019-05-01", "R"],
  ]
  if (!CONFIG) return;
  CONFIG = JSON.parse(kintone.plugin.app.getConfig(PLUGIN_ID).config);
  console.log('CONFIG', CONFIG);

  function getAdjustedDate(offset) {
    const date = new Date(); // today's date
    date.setDate(date.getDate() + offset); // adjust date by offset

    // Format the date to "YYYY-MM-DD"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  kintone.events.on(["app.record.edit.show", "app.record.create.show"], async (event) => {
    console.log(event);
    let record = event.record;
    for (const item of CONFIG.formatSetting) {
      if (item.space == "-----") continue;
      let spaceElement = kintone.app.record.getSpaceElement(item.space);
      // kintone.app.record.setFieldShown(item.storeField.code, false);
      let defaultDate = item.initialValue == "" ? getAdjustedDate(0) : item.initialValue == "1" ? getAdjustedDate(1) : item.initialValue == "-1" ? getAdjustedDate(-1) : getAdjustedDate(0);
      const datePicker = new Kuc.DatePicker({
        requiredIcon: true,
        language: "auto",
        className: "options-class-date",
        id: item.storeField.code,
        visible: true,
        disabled: false,
        value: event.type == "app.record.create.show" ? defaultDate : record[item.storeField.code].value,
      });
      $(datePicker).on('change', async (e) => {
        console.log(e.target.value);
        await setRecord(item.storeField.code, e.target.value);
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
    let eraSymbol = "";
    let eraStartYear = 0;

    // Loop through the calendar array to find the correct era
    for (let i = JP_CALENDAR.length - 1; i >= 0; i--) {
      const [startDateStr, symbol] = JP_CALENDAR[i];
      const startDate = new Date(startDateStr);

      // If the given date is on or after this era start date
      if (date >= startDate) {
        eraSymbol = symbol;
        eraStartYear = date.getFullYear() - startDate.getFullYear() + 1;
        break;
      }
    }

    // Format era year with two digits
    const customYear = String(eraStartYear).padStart(2, '0');
    return { eraSymbol, customYear };
  }

  kintone.events.on("app.record.detail.show", async (event) => {
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
    let record = event.record;

    for (const item of CONFIG.formatSetting) {
      let formatDate;
      let data = getFieldData(schemaPage, item.storeField.code);
      // Create a Date object
      const dateValue = record[item.storeField.code].value;
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
      if (formatDate) $(`.value-${data.id}`).find("span").text(formatDate);

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
        console.log('formatDate',formatDate);
        if (formatDate) $(field).find("span").text(formatDate);
      }

    }
    return event;
  }
  );
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);
