(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DogClubPlanner = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var MAX_NAME = 32;
  var MAX_AVOID = 180;
  var MAX_PHOTO = 2000000;
  var STATES = new Set(
    'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ')
  );
  var PET_ENUMS = {
    ageUnit: ['years', 'months'],
    weightUnit: ['lb', 'kg'],
    play: ['Fetch', 'Tug', 'Puzzles and sniffing', 'Puzzles', 'Cuddling'],
    chew: ['Gentle play', 'Sometimes tears toys', 'Quickly destroys toys'],
    texture: ['Soft bites', 'Crunchy treats', 'Either'],
    allergy: ['None known', 'Yes', 'Not sure'],
    restriction: ['None', 'Yes', 'Not sure']
  };
  var TOYS = [
    { id: 'rubber', label: 'Rubber fetch toy' },
    { id: 'puzzle', label: 'Treat-dispensing puzzle toy' },
    { id: 'rope', label: 'Rope tug toy' },
    { id: 'plush', label: 'Soft plush toy' }
  ];
  var TREATS = [
    { id: 'chicken', label: 'Chicken treats' },
    { id: 'beef', label: 'Beef treats' },
    { id: 'salmon', label: 'Salmon treats' },
    { id: 'pumpkin', label: 'Pumpkin treats' }
  ];

  // Read data properties only: inherited keys and accessors are not form values.
  function ownValue(object, key) {
    if (!object || typeof object !== 'object') return undefined;
    var descriptor = Object.getOwnPropertyDescriptor(object, key);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ? descriptor.value
      : undefined;
  }

  function stringValue(object, key) {
    var value = ownValue(object, key);
    return typeof value === 'string' ? value.trim() : '';
  }

  function clipped(value, max) {
    if (typeof value !== 'string') return '';
    // The first slice bounds work even when the input is unexpectedly enormous.
    return Array.from(value.trim().slice(0, max * 2)).slice(0, max).join('');
  }

  function pad(number, width) {
    return String(number).padStart(width, '0');
  }

  function isISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number);
    var year = parts[0], month = parts[1], day = parts[2];
    if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
    var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= days[month - 1];
  }

  function utcDate(iso) {
    if (!isISODate(iso)) throw new RangeError('Expected a real date in YYYY-MM-DD format.');
    var parts = iso.split('-').map(Number);
    var date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    // setUTCFullYear avoids Date.UTC's special handling of years 00 through 99.
    date.setUTCFullYear(parts[0], parts[1] - 1, parts[2]);
    return date;
  }

  function today(now = new Date()) {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new RangeError('Expected a valid Date.');
    }
    var year = now.getFullYear();
    if (year < 1 || year > 9999) throw new RangeError('Date is outside the supported year range.');
    return pad(year, 4) + '-' + pad(now.getMonth() + 1, 2) + '-' + pad(now.getDate(), 2);
  }

  function addDays(iso, count) {
    if (!Number.isSafeInteger(count)) throw new RangeError('The day offset must be a whole number.');
    var date = utcDate(iso);
    date.setUTCDate(date.getUTCDate() + count);
    var year = date.getUTCFullYear();
    if (!Number.isFinite(date.getTime()) || year < 1 || year > 9999) {
      throw new RangeError('Date is outside the supported year range.');
    }
    return pad(year, 4) + '-' + pad(date.getUTCMonth() + 1, 2) + '-' + pad(date.getUTCDate(), 2);
  }

  function formatDate(iso) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(utcDate(iso));
  }

  function earliestDate(now = new Date()) {
    return addDays(today(now), 1);
  }

  function defaultDate(now = new Date()) {
    return addDays(today(now), 7);
  }

  function weeklyDates(first) {
    return [0, 7, 14, 21].map(function (offset) { return addDays(first, offset); });
  }

  function validateDates(dates, todayStr = today()) {
    if (!isISODate(todayStr)) {
      return { ok: false, message: 'Delivery dates could not be checked. Please reload the page.' };
    }
    if (!Array.isArray(dates) || dates.length !== 4) {
      return { ok: false, message: 'Choose a requested delivery date for each of the first four weeks.' };
    }
    for (var index = 0; index < 4; index += 1) {
      if (!isISODate(dates[index])) {
        return { ok: false, message: 'Choose a real requested delivery date for Week ' + (index + 1) + '.' };
      }
      if (dates[index] <= todayStr) {
        return { ok: false, message: 'Week ' + (index + 1) + ' must have a requested delivery date after today.' };
      }
      if (index > 0 && dates[index] <= dates[index - 1]) {
        return { ok: false, message: 'The requested date for Week ' + (index + 1) + ' must be after Week ' + index + '.' };
      }
    }
    return { ok: true, message: '' };
  }

  function addressErrors(address) {
    var errors = [];
    var required = [
      ['recipient', 'Enter the recipient’s name.'],
      ['email', 'Enter a contact email address.'],
      ['address1', 'Enter the street address.'],
      ['city', 'Enter the city.'],
      ['state', 'Choose a state or the District of Columbia.'],
      ['zip', 'Enter a five-digit ZIP code or ZIP+4.']
    ];
    required.forEach(function (item) {
      if (!stringValue(address, item[0])) errors.push({ field: item[0], message: item[1] });
    });
    var email = stringValue(address, 'email');
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      errors.push({ field: 'email', message: 'Enter an email address such as name@example.com.' });
    }
    var state = stringValue(address, 'state');
    if (state && !STATES.has(state.toUpperCase())) {
      errors.push({ field: 'state', message: 'Choose one of the 50 states or the District of Columbia.' });
    }
    var zip = stringValue(address, 'zip');
    if (zip && !/^\d{5}(?:-\d{4})?$/.test(zip)) {
      errors.push({ field: 'zip', message: 'Use a five-digit ZIP code or ZIP+4, such as 00501 or 00501-1234.' });
    }
    var rawPhone = ownValue(address, 'phone');
    var phone = stringValue(address, 'phone');
    var digits = phone.replace(/\D/g, '');
    if ((rawPhone != null && typeof rawPhone !== 'string') ||
        (phone && (!/^[+\d().\s-]+$/.test(phone) || digits.length < 7 || digits.length > 15))) {
      errors.push({ field: 'phone', message: 'Enter a phone number containing 7 to 15 digits, or leave it blank.' });
    }
    return errors;
  }

  function toyOptions(profile) {
    var gentle = stringValue(profile, 'chew') === 'Gentle play';
    return TOYS.filter(function (option) {
      return gentle || (option.id !== 'rope' && option.id !== 'plush');
    }).map(function (option) {
      return { id: option.id, label: option.label };
    });
  }

  function treatOptions(profile) {
    var avoid = stringValue(profile, 'allergy') === 'Yes'
      ? clipped(stringValue(profile, 'avoid'), MAX_AVOID).normalize('NFKC').toLowerCase().replace(/[_‐‑‒–—-]+/g, ' ')
      : '';
    var allFood = /^(?:all|any)$/.test(avoid) ||
      /\b(?:everything|all\s+(?:foods?|ingredients?|treats?|proteins?))\b/.test(avoid);
    // These broad category matches are conservative filters, not ingredient approval.
    var generalMeat = avoid
      .replace(/\b(?:red|white)\s+meats?\b/g, '')
      .replace(/\b(?:poultry|bird|chicken|beef|salmon|fish)\s+meats?\b/g, '');
    var allAnimal = /\b(?:meats?|animal\s+(?:products?|proteins?)|vegan|vegetarian)\b/.test(generalMeat);
    var blocked = {
      chicken: allFood || allAnimal || /\b(?:chickens?|poultry|birds?|turkeys?|ducks?|geese|goose|quails?|white\s+meat)\b/.test(avoid),
      beef: allFood || allAnimal || /\b(?:beef|cows?|cattle|bovine|veal|red\s+meat)\b/.test(avoid),
      salmon: allFood || allAnimal || /\b(?:salmon|fish|fishes|seafood|shellfish)\b/.test(avoid),
      pumpkin: allFood || /\b(?:pumpkins?|squash|squashes|gourds?)\b/.test(avoid)
    };
    var selectedTexture = stringValue(profile, 'texture');
    var texture = selectedTexture === 'Soft bites' ? 'soft bites'
      : selectedTexture === 'Crunchy treats' ? 'crunchy treats'
      : 'mixed textures';
    var options = TREATS.filter(function (option) { return !blocked[option.id]; })
      .map(function (option) { return { id: option.id, label: option.label + ' — ' + texture }; });
    return options.length
      ? options
      : [{ id: 'review', label: 'Ingredient review needed before selection' }];
  }

  function defaultWeek(profile) {
    var toys = toyOptions(profile);
    var treats = treatOptions(profile);
    var preferred = {
      'Fetch': 'rubber',
      'Tug': 'rope',
      'Puzzles and sniffing': 'puzzle',
      'Puzzles': 'puzzle',
      'Cuddling': 'plush'
    }[stringValue(profile, 'play')];
    return {
      toy: toys.some(function (option) { return option.id === preferred; }) ? preferred : toys[0].id,
      treat1: treats[0].id,
      treat2: treats[Math.min(1, treats.length - 1)].id
    };
  }

  function normalizeWeek(week, profile) {
    var fallback = defaultWeek(profile);
    var toyIDs = toyOptions(profile).map(function (option) { return option.id; });
    var treatIDs = treatOptions(profile).map(function (option) { return option.id; });
    var selectedToy = stringValue(week, 'toy');
    var selectedFirst = stringValue(week, 'treat1');
    var selectedSecond = stringValue(week, 'treat2');
    var toy = toyIDs.includes(selectedToy) ? selectedToy : fallback.toy;
    var validFirst = treatIDs.includes(selectedFirst);
    var validSecond = treatIDs.includes(selectedSecond);
    var treat1 = validFirst ? selectedFirst : fallback.treat1;
    var treat2 = validSecond ? selectedSecond : fallback.treat2;
    if (treat1 === treat2 && treatIDs.length > 1) {
      if (!validFirst && validSecond) {
        treat1 = treatIDs.find(function (id) { return id !== treat2; });
      } else {
        treat2 = treatIDs.find(function (id) { return id !== treat1; });
      }
    }
    return { toy: toy, treat1: treat1, treat2: treat2 };
  }

  function recommend(weeks, profile, skipped = []) {
    var fallback = defaultWeek(profile);
    var toyIDs = toyOptions(profile).map(function (option) { return option.id; });
    var treatIDs = treatOptions(profile).map(function (option) { return option.id; });
    var toyCounts = new Map(toyIDs.map(function (id) { return [id, 0]; }));
    var treatCounts = new Map(treatIDs.map(function (id) { return [id, 0]; }));
    var skip = Array.isArray(skipped) ? skipped : [];
    var entries = Array.isArray(weeks) ? weeks.slice(0, 4) : [];
    entries.forEach(function (week, index) {
      // Boolean masks are the UI format. Numeric arrays may use zero-based indices.
      if (skip[index] === true || skip.some(function (item) { return Number.isInteger(item) && item === index; })) return;
      var toy = stringValue(week, 'toy');
      if (toyCounts.has(toy)) toyCounts.set(toy, toyCounts.get(toy) + 1);
      ['treat1', 'treat2'].forEach(function (key) {
        var treat = stringValue(week, key);
        if (treatCounts.has(treat)) treatCounts.set(treat, treatCounts.get(treat) + 1);
      });
    });
    function ranked(ids, counts, preferred) {
      return ids.slice().sort(function (left, right) {
        return counts.get(right) - counts.get(left) ||
          Number(right === preferred) - Number(left === preferred) ||
          ids.indexOf(left) - ids.indexOf(right);
      });
    }
    var toys = ranked(toyIDs, toyCounts, fallback.toy);
    var treats = ranked(treatIDs, treatCounts, fallback.treat1);
    return normalizeWeek({
      toy: toys[0],
      treat1: treats[0],
      treat2: treats[Math.min(1, treats.length - 1)]
    }, profile);
  }

  function safePhoto(photo) {
    if (typeof photo !== 'string' || photo.length > MAX_PHOTO) return '';
    if (photo === 'ryan.png' || photo === './ryan.png') return photo;
    return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)
      ? photo
      : '';
  }

  function safeProfile(profile, photo, weeks) {
    var saved = {};
    ['dogName', 'avoid'].forEach(function (key) {
      var value = ownValue(profile, key);
      if (typeof value === 'string') saved[key] = clipped(value, key === 'dogName' ? MAX_NAME : MAX_AVOID);
    });
    ['age', 'weight'].forEach(function (key) {
      var value = ownValue(profile, key);
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        saved[key] = value;
      } else if (typeof value === 'string') {
        var number = value.trim();
        if (number.length <= 16 && /^\d+(?:\.\d+)?$/.test(number) && Number.isFinite(Number(number))) {
          saved[key] = number;
        }
      }
    });
    Object.keys(PET_ENUMS).forEach(function (key) {
      var value = stringValue(profile, key);
      if (PET_ENUMS[key].includes(value)) saved[key] = value;
    });
    var circle = ownValue(profile, 'circle');
    if (typeof circle === 'boolean') saved.circle = circle;
    saved.photo = safePhoto(photo);
    var inputWeeks = Array.isArray(weeks) ? weeks : [];
    saved.weeks = [0, 1, 2, 3].map(function (index) {
      return normalizeWeek(inputWeeks[index], saved);
    });
    return saved;
  }

  return Object.freeze({
    today: today,
    isISODate: isISODate,
    addDays: addDays,
    formatDate: formatDate,
    earliestDate: earliestDate,
    defaultDate: defaultDate,
    weeklyDates: weeklyDates,
    validateDates: validateDates,
    addressErrors: addressErrors,
    toyOptions: toyOptions,
    treatOptions: treatOptions,
    defaultWeek: defaultWeek,
    normalizeWeek: normalizeWeek,
    recommend: recommend,
    safeProfile: safeProfile
  });
});
