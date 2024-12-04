jQuery.noConflict();
(async function ($, Swal10, PLUGIN_ID) {
  let CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID).config;

  if (!CONFIG) return;
  CONFIG = JSON.parse(kintone.plugin.app.getConfig(PLUGIN_ID).config);

  function getAdjustedDate(offset) {
    if (offset == "") return "";
    const date = new Date(); // today's date
    date.setDate(date.getDate() + Number(offset)); // adjust date by offset

    // Format the date to "YYYY-MM-DD"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Function to determine the Japanese era symbol and custom year
  function getJapaneseEra(date) {
    if (window.BoK) {
      if (!window.BoK.Constant.JpCalenderBase) return false;
    } else {
      return false;
    }
    const JP_CALENDAR = (window.BoK.Constant.JpCalenderBase).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    // date.setHours(7, 0, 0);
    // console.log('date', date);
    // console.log('JP_CALENDAR', JP_CALENDAR);

    let eraSymbol = "";
    let eraStartYear = 0;
    let eraStartDate = null;

    // Loop through the calendar array to find the correct era
    for (let i = JP_CALENDAR.length - 1; i >= 0; i--) {
      const startDateStr = JP_CALENDAR[i][0]; // The start date of the era
      const symbol = JP_CALENDAR[i][2];      // The era symbol (e.g., "R")
      const startDate = new Date(startDateStr); // The date object for the start date
      // console.log('startDate', startDate);

      // If the given date is on or after this era start date
      if (date >= startDate) {
        eraSymbol = symbol;
        eraStartDate = startDate;
        eraStartYear = date.getFullYear() - startDate.getFullYear(); // Difference in years

        // If the given date is before the start of the era, reset customYear to 1
        // if (date.getMonth() < startDate.getMonth() || (date.getMonth() === startDate.getMonth() && date.getDate() < startDate.getDate())) {
        //   eraStartYear -= 1;
        // }
        eraStartYear += 1;  // Start year should be 1 for the first year of the era
        break;
      }
      // if ((date.getFullYear() >= startDate.getFullYear()) && (date.getMonth() >= startDate.getMonth()) && (date.getDate() >= startDate.getDate())) {
      //   eraSymbol = symbol;
      //   eraStartDate = startDate;
      //   eraStartYear = date.getFullYear() - startDate.getFullYear(); // Difference in years

      //   // If the given date is before the start of the era, reset customYear to 1
      //   // if (date.getMonth() < startDate.getMonth() || (date.getMonth() === startDate.getMonth() && date.getDate() < startDate.getDate())) {
      //   //   eraStartYear -= 1;
      //   // }
      //   eraStartYear += 1;  // Start year should be 1 for the first year of the era
      //   break;
      // }
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

  async function convertJapaneseEraToDate(eraInput) {
    if (window.BoK) {
      if (!window.BoK.Constant.JpCalenderBase) {
        Swal10.fire({
          position: "center",
          icon: "error",
          text: "「定数管理プラグインを適用してください」",
          confirmButtonColor: "#3498db",
          showCancelButton: false,
          confirmButtonText: "OK",
          customClass: {
            confirmButton: 'custom-confirm-button'
          }
        })
        return false;
      }
    } else {
      Swal10.fire({
        position: "center",
        icon: "error",
        text: "「定数管理プラグインを適用してください」",
        confirmButtonColor: "#3498db",
        showCancelButton: false,
        confirmButtonText: "OK",
        customClass: {
          confirmButton: 'custom-confirm-button'
        }
      })
      return false;
    }
    const JP_CALENDAR = (window.BoK.Constant.JpCalenderBase).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    let eraSymbol, customYear, month, day;
    // Normalize the input: remove extra spaces and split into parts
    // Check for "eYY.MM.DD" format
    if (/^[A-Za-z]\d{2}\.\d{2}\.\d{2}$/.test(eraInput)) {
      const match = /^([A-Za-z])(\d{2})\.(\d{2})\.(\d{2})$/.exec(eraInput);
      [, eraSymbol, customYear, month, day] = match;
    } else if (/^[A-Za-z]\d{2}\d{2}\d{2}$/.test(eraInput)) {
      // Handle compact format: eYYMMDD
      const match = /^([A-Za-z])(\d{2})(\d{2})(\d{2})$/.exec(eraInput);
      [, eraSymbol, customYear, month, day] = match;
    } else if (/^[A-Za-z] \d{1,2} \d{1,2} \d{1,2}$/.test(eraInput)) {
      // Handle spaced format: e YY MM DD or e Y MM D
      const parts = eraInput.split(' ');
      [eraSymbol, customYear, month, day] = parts;
    } else {
      return false; // Explicitly return false for invalid formats
    }
    customYear = parseInt(customYear, 10); // Parse as integer
    month = parseInt(month, 10); // Parse as integer
    day = parseInt(day, 10); // Parse as integer

    // Validate parsed parts
    if (isNaN(customYear) || isNaN(month) || isNaN(day)) {
      return false;
    }
    // Find the corresponding era start date
    const eraData = JP_CALENDAR.find((entry) => entry[2].toUpperCase() === eraSymbol.toUpperCase());
    if (!eraData) {
      return false;
    }

    const eraStartDate = new Date(eraData[0]); // Get the era's start date

    // Determine the Gregorian year
    let year = eraStartDate.getFullYear() + customYear - 1;

    const eraStartMonth = eraStartDate.getMonth() + 1; // Month is 0-based
    const eraStartDay = eraStartDate.getDate();
    // If the input month/day falls before the era's start date, it must belong to the next Gregorian year
    // if (month < eraStartMonth || (month === eraStartMonth && day < eraStartDay)) {
    //   year++;
    // }

    // Validate the month and day
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }
    return {
      year: String(year),
      month: String(month),
      day: String(day)
    };
  }

  // Function to parse and convert various date formats to YYYY-MM-DD
  async function parseDate(input) {
    if (!input) return getAdjustedDate(0);
    try {
      const currentYear = new Date().getFullYear();

      let year, month, day;

      // Helper function to pad single-digit numbers with leading zeros
      const pad = (num) => String(num).padStart(2, "0");
      const isValidDate = (y, m, d) => {
        const date = new Date(y, m - 1, d); // Months are 0-indexed in JS
        return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
      };

      // Handle different formats
      if (/^\d{8}$/.test(input)) {
        // YYYYMMDD
        year = parseInt(input.slice(0, 4), 10);
        month = parseInt(input.slice(4, 6), 10);
        day = parseInt(input.slice(6, 8), 10);
      } else if (/^\d{6}$/.test(input)) {
        // YYMMDD
        year = parseInt(input.slice(0, 2), 10) + 2000; // Assuming 21st century
        month = parseInt(input.slice(2, 4), 10);
        day = parseInt(input.slice(4, 6), 10);
      } else if (/^\d{4}$/.test(input)) {
        // MMDD
        year = currentYear;
        month = parseInt(input.slice(0, 2), 10);
        day = parseInt(input.slice(2, 4), 10);
      } else if (/^\d{1,2}\/\d{1,2}$/.test(input)) {
        // MM/DD or MM/D
        const [m, d] = input.split("/");
        year = currentYear;
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4} \d{1,2} \d{1,2}$/.test(input)) {
        // YYYY M D
        const [y, m, d] = input.split(" ");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{2} \d{1,2} \d{1,2}$/.test(input)) {
        // YY M D
        const [y, m, d] = input.split(" ");
        year = parseInt(y, 10) + 2000; // Assuming 21st century
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{1,2} \d{1,2}$/.test(input)) {
        // M D
        const [m, d] = input.split(" ");
        year = currentYear;
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        // YYYY-MM-DD
        const [y, m, d] = input.split("-");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(input)) {
        // YYYY/MM/DD
        const [y, m, d] = input.split("/");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(input)) {
        // YYYY.MM.DD
        const [y, m, d] = input.split(".");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else {
        //eYYMMDD
        //e YY MM DD
        //e Y MM D
        let revert = await convertJapaneseEraToDate(input);
        if (!revert) return false;
        year = parseInt(revert.year, 10);
        month = parseInt(revert.month, 10);
        day = parseInt(revert.day, 10);
        // throw new Error(`Unrecognized date format: ${input}`);
      }
      // Validate the extracted date
      if (!isValidDate(year, month, day)) {
        return false; // Invalid date
      }

      return `${year}-${pad(month)}-${pad(day)}`;
    } catch (error) {
      return false;
    }
  }

  async function getFormatDate(dateValue, format) {
    if (!dateValue) return "";
    if (format === "-----") return dateValue;
    const date = new Date(dateValue);
    // date.setHours(9, 0, 0);
    let formatDate;
    let jpFormatDate;

    // Get era symbol and custom year

    // Extract parts of the date
    const yearFull = date.getFullYear(); // 2024
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 10
    const day = String(date.getDate()).padStart(2, '0'); // 30
    const yearShort = String(yearFull).slice(2); // 24

    switch (format) {
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
        jpFormatDate = getJapaneseEra(date);
        if (!jpFormatDate) return false;
        formatDate = `${jpFormatDate.eraSymbol}${jpFormatDate.customYear}.${month}.${day}`;
        break;
      case "e_YY_MM_DD":
        jpFormatDate = getJapaneseEra(date);
        if (!jpFormatDate) return false;
        formatDate = `${jpFormatDate.eraSymbol} ${jpFormatDate.customYear} ${month} ${day}`;
        break;

      default:
        formatDate = "";
        break;
    }
    return formatDate;
  }

  kintone.events.on(["app.record.edit.show", "app.record.create.show"], async (event) => {
    let record = event.record;
    let errors = {};
    for (let item of CONFIG.formatSetting) {
      if (item.space === "-----") continue;
      kintone.app.record.setFieldShown(item.storeField.code, false);
      let spaceElement = kintone.app.record.getSpaceElement(item.space);
      let defaultDate = getAdjustedDate(item.initialValue);
      if (event.type === "app.record.edit.show") defaultDate = record[item.storeField.code].value;

      //set default date to field
      record[item.storeField.code].value = defaultDate;
      let defaultInputValue = await getFormatDate(defaultDate, item.format);
      const dateInput = new Kuc.Text({
        label: item.storeField.label,
        value: defaultInputValue !== false ? defaultInputValue : defaultDate,
        textAlign: 'left',
        className: 'options-class',
        id: 'options-id',
        visible: true,
        disabled: false
      });
      // const inputContainer = $('<div></div>').addClass('control-gaia control-date-field-gaia');
      const inputContainer = $('<div></div>').addClass('control-gaia control-date-field-gaia');
      const label = $('<div></div>').addClass('control-label-gaia').append(
        $('<label></label>').addClass('control-label-text-gaia').text(item.storeField.label)
      );
      const inputGroup = $('<div></div>').addClass('control-value-gaia');
      const inputError = $('<div>').addClass('input-error-cybozu').append(
        $('<span></span>').text("不正な値です")
      ).css('width', '65px').hide()
      const input = $('<div></div>').addClass('input-date-cybozu').append(
        $('<input>').attr('type', 'text').addClass('input-date-text-cybozu').attr('value', defaultInputValue).on('change', async (e) => {
          let changeFormat = await parseDate(e.target.value.trim());
          if (changeFormat === false) {
            // dateInput.error = "不正な値です";
            $(inputError).show()
            errors[item.storeField.code] = "不正な値です";
          } else {
            if (errors[item.storeField.code]) delete errors[item.storeField.code]
            // dateInput.error = false;
            $(inputError).hide()
            e.target.value = await getFormatDate(changeFormat, item.format);
            await setRecord(item.storeField.code, changeFormat);
          }
  
        })
      );
      
      $(inputGroup).append(
        input,
        inputError
      );
      $(inputContainer).append(
        label,
        inputGroup
      )


      $(spaceElement).append(
          inputContainer
      )
      // $(spaceElement).append(
      //   $("<div>").addClass("control-gaia").append(
      //     dateInput
      //   )
      // )
      
      // $(dateInput).on('change', async (e) => {
      //   let changeFormat = await parseDate(e.target.value.trim());
      //   if (changeFormat === false) {
      //     dateInput.error = "不正な値です";
      //     errors[item.storeField.code] = "不正な値です";
      //   } else {
      //     if (errors[item.storeField.code]) delete errors[item.storeField.code]
      //     dateInput.error = false;
      //     e.target.value = await getFormatDate(changeFormat, item.format);
      //     await setRecord(item.storeField.code, changeFormat);
      //   }

      // })
    }

    async function setRecord(fieldCode, value) {
      let rec = kintone.app.record.get();
      rec.record[fieldCode].value = value
      kintone.app.record.set(rec);
    }

    kintone.events.on(["app.record.edit.submit", "app.record.create.submit"], async (event) => {
      if (Object.keys(errors).length > 0) event.error = "不正な値です"
      
      return event;
    });
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



  kintone.events.on("app.record.detail.show", async (event) => {
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
    let record = event.record;
    let errorMessage;

    for (const item of CONFIG.formatSetting) {

      let field = getFieldData(schemaPage, item.storeField.code);
      if (item.space != "-----") {
        let spaceElement = kintone.app.record.getSpaceElement(item.space);
        $(spaceElement).parent().remove();
      }
      // Create a Date object
      const dateValue = record[item.storeField.code].value;
      if (item.format === "-----") continue;
      let formatDate = await getFormatDate(dateValue, item.format);
      if (formatDate === false) {
        errorMessage = "「定数管理プラグインを適用してください」";
      } else {
        $(`.value-${field.id}`).find("span").text(formatDate);
      }

    }
    if (errorMessage) Swal10.fire({
      position: "center",
      icon: "error",
      text: errorMessage,
      confirmButtonColor: "#3498db",
      showCancelButton: false,
      confirmButtonText: "OK",
      customClass: {
        confirmButton: 'custom-confirm-button'
      }
    })

    return event;
  }
  );

  kintone.events.on("app.record.index.show", async (event) => {
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
    let errorMessage;

    for (const item of CONFIG.formatSetting) {
      let data = getFieldData(schemaPage, item.storeField.code);
      let fields = $(`.value-${data.id}`);

      // Create a Date object
      for (const field of fields) {
        const dateValue = $(field).find("span").text();
        if (item.format === "-----") continue;
        let formatDate = await getFormatDate(dateValue, item.format);
        if (formatDate === false) {
          errorMessage = "「定数管理プラグインを適用してください」";
        } else {
          $(field).find("span").text(formatDate);
        }
      }

    }
    if (errorMessage) return Swal10.fire({
      position: "center",
      icon: "error",
      text: errorMessage,
      confirmButtonColor: "#3498db",
      showCancelButton: false,
      confirmButtonText: "OK",
      customClass: {
        confirmButton: 'custom-confirm-button',
      }
    })
    return event;
  }
  );
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);
