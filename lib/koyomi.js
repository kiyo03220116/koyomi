/*
 * Copyright(c) 2015 Yuki Kurata <yuki.kurata@gmail.com>
 * MIT Licensed
 */

/**
 * 日本の年号、祝日、営業日に対応した日時計算クラスです
 */

var Koyomi = (function(){

  /**
   * *********************************************************
   *                       既定値設定
   * *********************************************************
   */

  /**
   * 既定のフォーマット
   * @property {String}
   */
  var DEFAULT_FORMAT = 'Y-m-d H:i:s';

  /**
   * 定休日
   *   複数設定する場合はカンマ区切り
   * @property {String|Function}
   */
  var REGULAR_HOLIDAY = '土,日';

  /**
   * 年末年始・お盆等の休み
   *   複数設定する場合はカンマ区切り
   * @property {String|Function}
   */
  var SEASON_HOLIDAY = '12/29-1/3';

  /**
   * 年号
   *  N: 年号の正式表記
   *  n: 年号の略式表記
   *  y: その年号の最初の年 (元年)
   *  d: その年号の最初の日
   */
  var NENGO = [
    {N: '平成', n: 'H', y: 1989, d: new Date('1989-01-08 00:00:00.000')},
    {N: '昭和', n: 'S', y: 1926, d: new Date('1926-12-25 00:00:00.000')},
    {N: '大正', n: 'T', y: 1912, d: new Date('1912-07-30 00:00:00.000')},
    {N: '明治', n: 'M', y: 1868, d: new Date('1868-01-25 00:00:00.000')},
    {N: '西暦', n: '' , y:    1, d: new Date('0001-01-01 00:00:00.000')}
  ];

  /**
   * 祝日法施行以降(1948/7/20-)の祝日を定義する
   */
  var HOLIDAYS = [

    // 祝日
    '元日         1949-/1/1',
    '成人の日     1949-1999/1/15  2000-/1/2mon',
    '建国記念の日 1967-/2/11',
    '春分の日',
    '天皇誕生日   1949-1988/4/29',
    'みどりの日   1989-2006/4/29',
    '昭和の日     2007-/4/29',
    '憲法記念日   1949-/5/3',
    'みどりの日   2007-/5/4',
    'こどもの日   1949-/5/5',
    '海の日       1996-2002/7/20  2003-/7/3mon',
    '山の日       2016-/8/11',
    '敬老の日     1966-2002/9/15  2003-/9/3mon',
    '秋分の日',
    '体育の日     1966-1999/10/10 2000-/10/2mon',
    '文化の日     1948-/11/3',
    '勤労感謝の日 1948-/11/23',
    '天皇誕生日   1989-/12/23',

    // 特別な休日
    '振替休日',
    '国民の休日',

    // 皇室慶弔行事
    '皇太子・明仁親王の結婚の儀  1959/4/10',
    '昭和天皇の大喪の礼          1989/2/24',
    '即位の礼正殿の儀            1990/11/12',
    '皇太子・徳仁親王の結婚の儀  1993/6/9'

  ];

  /**
   * *********************************************************
   *               パラメータ文字列の変換定義
   *
   *       thisから他の変換定義にアクセスすることができます
   * *********************************************************
   */
  
  /**
   * パラメータ文字列 (クラスでも使用可能)
   * 一つの引数Dateインスタンスをとる関数を定義します
   */
  var PARAMS_ALL = {

    //  -----  カスタマイズ  -----

    // 日付 2015/04/06
    hizuke: function (t) {
      return this.Y(t) + '/' + this.m(t) + '/' + this.d(t);
    },

    // 和暦-年区切り   平成1年1月7日
    wareki: function (t) {
      return this.nengo(t) + this.nen(t) + '年' + this.n(t) + '月' + this.j(t) + '日';
    },

    // 和暦-日付区切り 昭和64年1月7日
    wareki2: function (t) {
      return Koyomi.format(t, 'NengoNen年n月j日'); // warekiより簡単な方法
    },


    //  -----  年  -----

    // 西暦-4桁    2014
    Y: function (t) {return t.getFullYear();},

    // 西暦-下2桁  14
    y: function (t) {return String(t.getFullYear()).slice(-2);},

    // うるう年判定  1:うるう年、0:平年
    L: function (t) {return new Date(t.getFullYear(), 1, 29).getDate() === 29 ? 1 : 0;},


    // -----  和暦 (年区切り)-----

    // 和暦-年号   平成
    nengo: function (t) {return getNengo(t).N;},

    // 和暦-年号   H
    nengo2: function (t) {return getNengo(t).n;},

    // 和暦-年     1,  27
    nen: function (t) {
      return t.getFullYear() - getNengo(t).y + 1;
    },

    // 和暦-年     元,  27
    nen2: function (t) {
      var n = t.getFullYear() - getNengo(t).y + 1;
      return n === 1 ? '元' : n;
    },

    // 和暦-年     元,  二十七,  一八七二  (西暦になった場合はnen4と同じ表記)
    nen3: function (t) {
      var n = t.getFullYear() - getNengo(t).y + 1;
      return n === 1 ? '元' : kan(n, 100 < n);
    },

    // 和暦-年     元,  二七,    一八七二
    nen4: function (t) {
      var n = t.getFullYear() - getNengo(t).y + 1;
      return n === 1 ? '元' : kan(n, true);
    },


    // -----  和暦 (日付区切り) -----

    // 和暦-年号  平成
    Nengo: function (t) {return getNengo(t, true).N;},

    // 和暦-年号  H
    Nengo2: function (t) {return getNengo(t, true).n;},

    // 和暦-年    1,  24
    Nen: function (t) {
      return t.getFullYear() - getNengo(t, true).y + 1;
    },

    // 和暦-年    元,  24
    Nen2: function (t) {
      var n = t.getFullYear() - getNengo(t, true).y + 1;
      return n === 1 ? '元' : n;
    },

    // 和暦-年    元,  二十四,  一八七二  (西暦になった場合はNen4と同じ表記)
    Nen3: function (t) {
      var n = t.getFullYear() - getNengo(t, true).y + 1;
      return n === 1 ? '元' : kan(n, 100 < n);
    },

    // 和暦-年    元,  二四,    一八七二
    Nen4: function (t) {
      var n = t.getFullYear() - getNengo(t, true).y + 1;
      return n === 1 ? '元' : kan(n, true);
    },


    // -----  月  -----

    // 0あり   08,  12 
    m    : function (t) {return ('0' + (t.getMonth() + 1)).slice(-2);},

    // 0無し    8,  12
    n: function (t) {return t.getMonth() + 1;},

    // 英語    August
    F: function (t) {return MONTH[t.getMonth()];},

    // 英語    Aug
    M: function (t) {return MONTH[t.getMonth()].substring(0, 3);},

    // 日本語  睦月, 如月
    watuki : function (t) {return JMONTH[t.getMonth()];},

    // 漢数字  八,  十二
    tuki: function (t) {return kan(t.getMonth() + 1);},

    // 漢数字  八,  一二
    tuki2: function (t) {return kan(t.getMonth() + 1, true);},

    // 月の日数 28, 29, 30, 31
    t: function (t) {
      var c = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      return c.getDate();
    },


    // -----  週  -----

    // 週番号 1月始まり、週の始まり月曜
    W: function (t) {return getWeekNumber(t);},

    // 週番号 4月始まり、週の始まり日曜
    Wj: function (t) {return getWeekNumber(t, '日', 4);},

    // -----  日  -----

    // 05,  25
    d  : function (t) {return ('0' + t.getDate()).slice(-2);},

    //  5,  25
    j: function (t) {return t.getDate();},

    // 漢数字 二十四
    niti: function (t) {return kan(t.getDate());},

    // 漢数字 二四
    niti2: function (t) {return kan(t.getDate(), true);},

    // 接尾語 st nd rd th
    S: function (t) {return SUFFIX[t.getDate()];},

    // 年通算日数  0から開始
    z: function (t) {return Math.floor((t.getTime() - new Date(t.getFullYear(), 0, 1).getTime()) / A_DAY); },


    // -----  曜日  -----

    // 日:0 -> 土:6
    w: function (t) {return t.getDay();},

    // 月:1 -> 日:7
    N: function (t) {return t.getDay() || 7;},

    // Monday
    l: function (t) {return WEEK[t.getDay()];},

    // Mon
    D: function (t) {return WEEK_SHORT[t.getDay()];},

    // 日本語 月, 火, 水
    yobi: function (t) {return JWEEK[t.getDay()];},

    // 日本語 月, 火, 祝
    yobi2: function (t) {return this.holiday(t) ? '祝' : this.yobi(t);},

    // 日本語 月曜日, 火曜日, 祝日
    yobi3: function (t) {
      var y = this.yobi2(t);
      return y + ( y === '祝' ? '日' : '曜日');
    },

    //  -----  祝日  -----

    // 祝日名  元日, 成人の日
    holiday: function (t) {return getHolidayName(t) || '';},

    //  -----  時  -----

    // 12時間 0無し    3
    g: function (t) {return t.getHours() % 12;},

    // 24時間 0無し    3, 15
    G: function (t) {return t.getHours();},

    // 12時間 0あり    03, 15
    h: function (t) {return ('0' + t.getHours() % 12).slice(-2);},

    // 24時間 0あり    15
    H: function (t) {return ('0' + t.getHours()).slice(-2);},


    //  -----  分  -----

    // 0あり  05,  38
    i: function (t) {return ('0' + t.getMinutes()).slice(-2);},

    // 0なし  5,  38
    i2: function (t) {return t.getMinutes();},


    //  -----  秒  -----

    // 0あり  07,  29
    s: function (t) {return ('0' + t.getSeconds()).slice(-2);},

    // 0なし  7,  29
    s2: function (t) {return t.getSeconds();},


    //  -----  マイクロ秒  -----

    // 065000  (ミリ秒までしか計測できないので下3桁は常に0になる)
    u: function (t) {return ('00' + t.getMilliseconds()).slice(-3) + '000'; },


    //  -----  午前午後  -----

    // am/pm
    a: function (t) {return t.getHours() < 12 ? 'am' : 'pm';},

    // AM/PM
    A: function (t) {return t.getHours() < 12 ? 'AM' : 'PM';},

    // 午前/午後
    aj: function (t) {return t.getHours() < 12 ? '午前' : '午後';}
  };

  /**
   * インスタンス限定のパラメータ文字列
   * ２つの引数をとる関数を設定します
   *    k: Koyomiのインスタンス
   *    t: Dateのインスタンス
   */
  var PARAMS_LIMIT = {

    //  -----    週    -----

    // 週番号  インスタンスの設定から計算
    Wn:   function  (t, k) { return getWeekNumber(t, k.startWeek, k.startMonth); },


    //  -----  営業日  -----

    // 月, 火, 休
    eigyo: function (t, k) { return k.isOpened(t) ? this.yobi(t) : '休';},

    // 月曜日, 火曜日, 休業日
    eigyo2: function (t, k) {
      var eg = this.eigyo(t, k);
      return eg + (eg === '休' ? '業日' : '曜日');
    },

    // 休業日理由    祝日, 休業日, 定休日
    closed: function (t, k) {
      if (k.isHolidayClosed(t)) {return '祝日';}
      if (k.isSeasonHoliday(t)) {return '休業日';}
      if (k.isRegularHoliday(t)) {return '定休日';}
      return '';
    }
  };

  // LIMIT <-add- ALL
  Object.keys(PARAMS_ALL).forEach(function(x){PARAMS_LIMIT[x] = PARAMS_ALL[x];});

  /**
   * *********************************************************
   *                    定数    (変更不可)
   * *********************************************************
   */

  // ミリ秒
  var A_WEEK   = 604800000;
  var A_DAY    =  86400000;
  var A_HOUR   =   3600000;
  var A_MINUTE =     60000;
  var A_SECOND =      1000;

  // 月名一覧
  var MONTH = ('January,February,March,April,May,June,' +
      'July,August,September,October,November,December').split(',');
  var JMONTH = ('睦月,如月,弥生,卯月,皐月,水無月,' +
      '文月,葉月,長月,神無月,霜月,師走').split(',');

  // 日の接尾語
  var SUFFIX = ('0,' +
    'st,nd,rd,th,th,th,th,th,th,th,' +
    'th,th,th,th,th,th,th,th,th,th,' +
    'st,nd,rd,th,th,th,th,th,th,th,st').split(',');

  // 曜日
  var WEEK = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(',');
  var WEEK_SHORT = 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',');
  var JWEEK = '日月火水木金土'.split('');

  // 曜日名一覧  英語は小文字に変更されます
  var WEEK_NAMES = [].slice.call(WEEK).concat(WEEK_SHORT)
                .map(function(x){return x.toLowerCase();}).concat(JWEEK);

  // 漢数字
  var JNUM = ',一,二,三,四,五,六,七,八,九'.split(',');

  //年号一覧    ['平成', 'H', '昭和', 'S',...]  (toDate・和暦西暦変換正規表現用)
  var NENGO_NAMES = NENGO.reduce(function(x, nengo) {
    if (nengo.n) { x.push(nengo.N); x.push(nengo.n); }
    return x;
  }, []);

  // 和暦西暦変換用正規表現
  var REG_NENGO = new RegExp('^(' + NENGO_NAMES.join('|') + ')(\\d+)\\D+(\\d+)\\D+(\\d+)\\D*$');

  // パレメータ名一覧  ※文字長が大きい順 (REG_MUSH用)
  var PARAM_KEYS_ALL = Object.keys(PARAMS_ALL).sort(function(x, y){return y.length - x.length;});
  var PARAM_KEYS_LIMIT = Object.keys(PARAMS_LIMIT).sort(function(x, y){return y.length - x.length;});

  // パラメータ文字列を{}付きするための正規表現
  var REG_MUSH_ALL = new RegExp(PARAM_KEYS_ALL.join('|'), 'g');
  var REG_MUSH_LIMIT = new RegExp(PARAM_KEYS_LIMIT.join('|'), 'g');

  /**
   * *********************************************************
   *               コンストラクタ・プロパティ
   * *********************************************************
   */

  /**
   * @class Koyomi
   * @param  {Object} config
   */
  function Koyomi (config) {
    config = config || {};

    // 既定のフォーマット
    Object.defineProperty(this, '_defaultFormat', {value: null, writable:true});
    Object.defineProperty(this, '_defaultFormatInput', {value: null, writable:true});
    this.defaultFormat = config.defaultFormat || DEFAULT_FORMAT;

    // 定休日
    Object.defineProperty(this, '_regularHoliday', {value: null, writable:true});
    Object.defineProperty(this, '_regularHolidayInput', {value: null, writable:true});
    this.regularHoliday = config.regularHoliday || REGULAR_HOLIDAY;

    // 年末年始・お盆等の休み
    Object.defineProperty(this, '_seasonHoliday', {value: null, writable:true});
    Object.defineProperty(this, '_seasonHolidayInput', {value: null, writable:true});
    this.seasonHoliday = config.seasonHoliday || SEASON_HOLIDAY;

    // 祝日を営業日にするか
    this.holidayOpened = config.holidayOpened || false;

    // 年の始まり
    this.startMonth = config.startMonth || 1;

    // 週の始まり
    this.startWeek = config.startWeek || '月';

    // カレンダーデータを6週分取得
    this.six = config.six || true;
  }

  /**
   * formatメソッドの既定のフォーマット
   * @property {String} defaultFormat
   */
  Object.defineProperty(Koyomi.prototype, 'defaultFormat', {
    enumarable: true,
    get: function () {return this._defaultFormatInput;},
    set: function (value) {
      this._defaultFormatInput = value;
      value = value || DEFAULT_FORMAT;
      if (!~value.indexOf('{')) {
        value = value.replace(REG_MUSH_LIMIT, function (x) { return '{' + x + '}';});
      }
      this._defaultFormat = value;
    }
  });

  /**
   * 定休日
   * 
   * '土,日'、'10,20'、'2火,3火'、 '土,日,2火,30'、
   * 曜日、日、第nw曜日を指定することができます。混合も可能
   * 固定値の代わりにDateを受け取りBoolean(休みかどうか)を
   * 返す関数を定義することもできます
   * 内部で使用されるの_regularHolidayです
   * @property {String|Function} regularHoliday
   */
  Object.defineProperty(Koyomi.prototype, 'regularHoliday', {
    enumarable: true,
    get: function () { return this._regularHolidayInput;},
    set: function (value) {
      this._regularHolidayInput = value;
      if (typeof value === 'function') {
        this._regularHoliday = value.bind(this);
      } else if (typeof value === 'string') {
        var r = {};
        value = value.split(',').map(function(x){return x.trim();});

        // 曜日
        var week = getWeekIndex(value);
        if (week) {
          r.week = week;
        }

        // 日
        var REG_NUM = /^\d{1,2}$/;
        var day = value.map(function(x) {
          return REG_NUM.test(x) ? x * 1 : 0;
        }).filter(function (x){ return 1 <= x && x <= 31;});
        if (day.length) {
          r.day = day;
        }

        // 第nw曜日
        var REG_NUMYOBI = /^(\d)(.+)$/;
        var nyobi = value.map(function(x) {
          var m = x.match(REG_NUMYOBI);
          if (m) {
            var n = m[1] * 1;
            var w = getWeekIndex(m[2]);
            if (1 <= n && n <= 6 && w !== null) {
              return [n, w];
            }
          }
          return null;
        }).filter(function (x){ return x;});
        if (nyobi.length) {
          r.nyobi = nyobi;
        }
        this._regularHoliday = r;

      } else if (typeof value === 'number' &&  1 <= value && value <= 31) {
        // 日単独指定
        this._regularHoliday = {day: [value]};
      } else {
        this._regularHoliday = {};
      }
    }
  });

  /**
   * 年末年始・お盆休みの定義
   * 固定値の代わりにDateを受け取りBoolean(休みかどうか)を
   * 返す関数を定義することもできます
   * 
   * @property {String|Function} seasonHoliday
   */
  Object.defineProperty(Koyomi.prototype, 'seasonHoliday', {
    enumarable: true,
    get: function () { return this._seasonHolidayInput; },
    set: function (value) {
      this._seasonHolidayInput = value;
      if (typeof value === 'function') {
        this._seasonHoliday = value.bind(this);
      } else if (typeof value === 'string') {
        value = getDateArray(value);
        this._seasonHoliday = value.length ? value : null;
      } else {
        this._seasonHoliday = null;
      }
    }
  });

  /**
   * *********************************************************
   *                   フォーマット
   * *********************************************************
   */
  
  // {}付きパラメータ文字列を検出する正規表現
  var REG_PLACE = /\{(\w+)\}/g;


  /**
   * フォーマット
   * 日時をパラメータ文字列にそって整形します
   * @method format
   * @param  {Date|String} date        日時
   * @param  {String}      format      フォーマット 既定値 DEFAULT_FORMAT
   * @return {String}      formatted
   */
  Koyomi.format = formatDate;
  function formatDate (date, format) {
    date = toDate(date);
    if (!date) {
      return '';
    }
    format = format || DEFAULT_FORMAT;
    if (!~format.indexOf('{')) {
      format = format.replace(REG_MUSH_ALL, function (x) { return '{' + x + '}';});
    }
    return format.replace(REG_PLACE, function (x, param){
      return param in PARAMS_ALL ? PARAMS_ALL[param](date) : x;
    });
  }

  /**
   * フォーマット
   * 日時をパラメータ文字列にそって整形します
   * @method format
   * @param  {Date|String} date       日時
   * @param  {String}      format     フォーマット     省略時 koyomi.defaultFormat
   * @param  {Number}      eigyobi    加算する営業日数 省略時 null
   * @param  {Boolean}     include    初日を含む       省略時 false
   * @return {String}      formatted
   */
  Koyomi.prototype.format = function formatDate2 (date, format, eigyobi, include) {
    var koyomi = this;
    date = toDate(date);
    if (!date) {
      return '';
    }
    if (typeof eigyobi === 'number') {
      date = koyomi.addEigyobi(date, eigyobi, include);
    }
    format = format || this._defaultFormat;
    if (!~format.indexOf('{')) {
      format = format.replace(REG_MUSH_LIMIT, function (x) { return '{' + x + '}';});
    }
    return format.replace(REG_PLACE, function (x, param){
      return param in PARAMS_LIMIT ? PARAMS_LIMIT[param](date, koyomi) : x;
    });
  };

  // パラメータ文字列一覧
  Koyomi.params = Object.keys(PARAMS_ALL);
  Koyomi.prototype.params = Object.keys(PARAMS_LIMIT);

  /**
   * *********************************************************
   *                       日時の計算
   * *********************************************************
   */
  var TANI = {
    d : ['d', 'days', 'day', '日'],
    h : ['h', 'hour', 'hours', '時間'],
    i : ['i', 'min', 'minute', 'minutes', '分'],
    y : ['y', 'age', 'year', 'years', '年', 'ヶ年', 'か年', 'カ年', 'ケ年', '箇年', '個年'],
    m : ['m', 'mo', 'mon', 'month', 'months', '月', 'ヶ月', 'か月', 'カ月', 'ケ月', '箇月', '個月'],
    w : ['w', 'week', 'weeks', '週', '週間'],
    s : ['s', 'sec', 'second', 'seconds', '秒'],
    ms: ['ms', 'millisecond', 'milliseconds', 'ミリ秒']
  };

  var REG_ADD = /[ 　,、]/g;
  var REG_ADD2 = /([-+]?\d+)([^-+0-9]+)/ig;

  /**
   * 日時の計算
   *
   *  加算(減算)することができる単位は、年、ケ月、週、日、時間、分、秒、ミリ秒です
   *  各単位で使用できる記述は定数TANIで確認してください
   *  
   * @method add
   * @param  {String|Date} date
   * @param  {String}      value
   * @return {Date}        date
   */
  Koyomi.add = add;
  function add (date, value) {
    date = toDate(date, false, true);  // 複製
    var keys = Object.keys(TANI);
    var order = [];
    value.replace(REG_ADD, '').replace(REG_ADD2, function(m, v, t){
      keys.some(function(k) {
        t = t.toLowerCase();
        if (~TANI[k].indexOf(t)) {
          order.push([k, v * 1]);
          return true;
        }
        return false;
      });
      return '';
    });
    var d;
    order.forEach(function(x){
      switch(x[0]) {
      case 'd':
        date.setTime(date.getTime() + A_DAY * x[1]);
        break;
      case 'h':
        date.setTime(date.getTime() + A_HOUR * x[1]);
        break;
      case 'i':
        date.setTime(date.getTime() + A_MINUTE * x[1]);
        break;
      case 'y':
        d = date.getDate();
        date = new Date(date.getFullYear() + x[1], date.getMonth(), d,
                        date.getHours(), date.getMinutes(), date.getSeconds(),
                        date.getMilliseconds());
        if (d !== date.getDate()) {
          // うるう年の補正 (2/29は2/28とします)
          date.setTime(date.getTime() - A_DAY);
        }
        break;
      case 'm':
        d = date.getDate();
        date = new Date(date.getFullYear(), date.getMonth() + x[1], d,
                        date.getHours(), date.getMinutes(), date.getSeconds(),
                        date.getMilliseconds());
        if (d !== date.getDate()) {
          // 末日から末日に処理されることがあります
          date.setTime(date.getTime() - date.getDate() * A_DAY);
        }
        break;
      case 'w':
        date.setTime(date.getTime() + A_WEEK * x[1]);
        break;
      case 's':
        date.setTime(date.getTime() + A_SECOND * x[1]);
        break;
      case 'ms':
        date.setTime(date.getTime() + x[1]);
        break;
      }
    });
    return date;
  }

  /**
   * 月初の日付を取得します
   * 時以下は切り捨てられます
   * @method frist
   * @param  {Date|String} date
   * @return {Date}        date
   */
  Koyomi.first = first;
  function first(date) {
    date = toDate(date);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * 月末の日付を取得します
   * 時以下は切り捨てられます
   * @method last
   * @param  {Date|String} date
   * @return {Date}        date
   */
  Koyomi.last = last;
  function last(date) {
    date = toDate(date);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * ２つの日の差の日数を返します
   * 計算時２つの日の時の部分は切り捨てられます
   * @method days
   * @param  {Date|String} from
   * @param  {Date|String} to
   * @return {Number}      days
   */
  Koyomi.days = days;
  function days (from, to) {
    var f = toDate(from, true);
    var t = toDate(to, true);
    if (!f || !t) {
      return null;
    }
    return (t.getTime() - f.getTime()) / A_DAY;
  }

  // 時間の正規表現
  var REG_TIME = /^(\d{1,2})\D+(?:(\d{1,2})(?:\D+(\d{1,2}))?)?\D*$/;

  /**
   * ２つの時間の秒数差を返します
   * ミリ秒は切り捨てられます
   *
   * 文字列の場合は'x時y分z秒'などの時間だけの表記も受け付けます
   * その際、日の部分は本日になります
   * @method seconds
   * @param  {Date|String} from
   * @param  {Date|String} to
   * @return {Number}      days
   */
  Koyomi.seconds = seconds;
  function seconds (from, to) {
    var f = toDate(from);
    var t = toDate(to);
    var today = new Date();
    if (f) {
      f = new Date(f.getFullYear(), f.getMonth(), f.getDate(),
                    f.getHours(), f.getMinutes(), f.getSeconds());
    } else if (typeof from === 'string'){
      var m1 = from.match(REG_TIME);
      if (m1) {
        f = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                      m1[1] * 1, (m1[2] || 0) * 1, (m1[3] || 0) * 1);
      } else {
        return null;
      }
    } else {
      return null;
    }
    if (t) {
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate(),
                    t.getHours(), t.getMinutes(), t.getSeconds());
    } else if (typeof to === 'string'){
      var m2 = to.match(REG_TIME);
      if (m2) {
        t = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                      m2[1] * 1, (m2[2] || 0) * 1, (m2[3] || 0) * 1);
      } else {
        return null;
      }
    } else {
      return null;
    }
    return (t.getTime() - f.getTime()) / A_SECOND;
  }


  /**
   * *********************************************************
   *                       営業日計算
   * *********************************************************
   */

  /**
   * 営業日の算出
   *
   * 適用事例:納品日を表示したい等
   *
   * 営業日を計算します
   * 時間部分の値は変化しません
   * 一年先(前)に見つからなかった場合はnullを返します
   * 
   * 営業日のルールは以下のとおり
   *
   * 加算する日数に1以上の場合は、翌営業日からカウントして算出します
   * 加算する日数が0の場合は、dataが営業日であればdateを、そうでない場合は翌営業日を返します
   * 加算する日数が-1以下の場合は、さかのぼって算出します
   *
   * その際includeがtrueの場合、dateもカウントの対象に含みます
   * 加算する日数が0の場合はincludeは無視されます
   * 
   * @method addEigyobi
   * @param  {Date|String}     date
   * @param  {Number}          days     加算する日数
   * @param  {Boolean}         include  初日を含む
   */
  Koyomi.prototype.addEigyobi = function addEigyobi(date, days, include) {
    var koyomi = this;
    date = toDate(date);
    if (!date) {
      return null;
    }

    // 0の場合の補正  +1営業日で前日からにすると同じ
    if (days === 0) {
      days = 1;
      date.setTime(date.getTime() - A_DAY);

    } else if (include) {
      // 当日を含む場合は、一日前（先）にずらして調査すると同じ
      date.setTime(date.getTime() + (0 < days ? -A_DAY : A_DAY));
    }

    // 最大調査日数
    var max = 365;

    // 以下営業日の計算
    while(days) {
      date.setTime(date.getTime() + (0 < days ? A_DAY : -A_DAY));
      if (koyomi.isOpened(date)) {
        days = 0 < days ? days - 1 : days + 1;
      }
      if (--max < 0) {
        return null;
      }
    }
    return date;
  };

  /**
   * 営業日から逆引き
   *
   * 適用事例：納品しなければならない注文の受注日の閾日を調べたい等
   *
   * dateが営業日の場合
   *   dateからdays営業日を引いた日付を返します
   * dateが休業日の場合
   *   dateから一番近い営業日からdays営業日を引いた日付を返します
   * 時間部分の値は変化しません
   * 一年先(前)に見つからなかった場合はnullを返します
   * 
   * 1以上の場合は、過去の日付を返します
   * daysが0の場合はその日が営業日ならその日を、そうでなければ一番近い日を返します
   * -1以下の場合は、未来の日付を返します
   * 
   * @method toEigyobi
   * @param  {Date|String}     date
   * @param  {Number}          days
   * @param  {Boolean}         include   初日を含む
   * @return {Date}            date
   */
  Koyomi.prototype.toEigyobi = function toEigyobi(date, days, include) {
    var koyomi = this;
    date = toDate(date);
    if (!date) {
      return null;
    }

    // 0の場合の補正  過去に一番近い営業日となる
    if (days === 0) {
      return koyomi.addEigyobi(date, -1, true);
    }

    // 順行
    var forward = 0 < days ? 1 : -1;

    // loopで最初に1日進むので1日対象を戻しておく
    date.setTime(date.getTime() + A_DAY * forward);

    // 最大調査日数
    var max = 365;

    // 逆引き調査
    while (days) {
      date.setTime(date.getTime() - A_DAY * forward);
      if (koyomi.isOpened(date)) {
        days -= forward;
      }
      if (--max < 0) {
        return null;
      }
    }
    if (!include) {
      date.setTime(date.getTime() - A_DAY * forward);
    }
    return date;
  };

  /**
   * 営業日数の調査
   *
   * 適用事例: 出勤日数を調べる
   * 
   * @method countEigyobi
   * @param  {String|Date}     from
   * @param  {String|Date}     to
   * @return {Number}          count
   */
  Koyomi.prototype.countEigyobi = function countEigyobi (from, to) {
    var koyomi = this;
    from = toDate(from, true);
    to = toDate(to, true);
    if (!from || !to) {
      return null;
    }
    if (to.getTime() < from.getTime()) {
      return null;
    }

    // 営業日数調査
    var count = 0;
    while(from.getTime() <= to.getTime()) {
      if (koyomi.isOpened(from)) {
        count++;
      }
      from.setTime(from.getTime() + A_DAY);
    }

    return count;
  };


  /**
   * *********************************************************
   *                    営業日・休業日判定
   * *********************************************************
   */

  /**
   * 営業日判定
   *
   *  営業日のチェックは次の３つを確認します
   *
   *    1, 定休日（土日休み、5・15・25日休み、第2・3火曜休み等）
   *    2, 年末年始・お盆の休み
   *    3, 祝日 (holidayOpend===false時のみ)
   * 
   * @method isOpened
   * @param  {Date}    date
   * @return {Boolean} opened
   */
  Koyomi.prototype.isOpened = function isOpened(date) {
    date = toDate(date);

    // 定休日判定
    if (this.isRegularHoliday(date)) {
      return false;
    }

    // 年末年始・お盆等の休みの判定
    if (this.isSeasonHoliday(date)) {
      return false;
    }

    // 祝日判定
    if (this.isHolidayClosed(date)) {
      return false;
    }

    return true;
  };

  /**
   * 定休日判定
   * @method isRegularHoliday
   * @param  {Date|String}         date
   * @return {Boolean}        closed
   */
  Koyomi.prototype.isRegularHoliday = function isRegularHoliday (date) {
    date = toDate(date);

    var regular = this._regularHoliday;

    if (!regular) {
      return false;
    }

    if (typeof regular === 'object') {

      // 週
      var week = regular.week;
      if (week && ~week.indexOf(date.getDay())) {
        return true;
      }

      // 日
      var day = regular.day;
      if (day && ~day.indexOf(date.getDate())) {
        return true;
      }

      // 第ny曜日
      var nyobi = regular.nyobi;
      if (nyobi && nyobi.some(function(x) {
        return  date.getDay() === x[1] &&
                parseInt((date.getDate() + 6) / 7, 10)  === x[0];
      })) {
        return true;
      }

      return false;
    }

    if (typeof regular === 'function') {
      return regular(date);
    }

    return false;

  };

  /**
   * 年末年始・お盆の休日判定
   * @method isSeasonHoliday
   * @param  {Date|String}        date
   * @return {Boolean}            closed
   */
  Koyomi.prototype.isSeasonHoliday = function isSeasonHoliday (date) {
    date = toDate(date);

    var season = this._seasonHoliday;

    if (!season) {
      return false;
    }

    if (Array.isArray(season)) {
      var key = (date.getMonth() + 1) * 100 + date.getDate() * 1;
      return season.indexOf(key) !== -1;
    }

    if (typeof season === 'function') {
      return season(date);
    }

    return false;
  };

  /**
   * 祝日休み判定
   * @method isHolidayClosed
   * @param  {Date|String}   date
   * @return {Boolean}       closed
   */
  Koyomi.prototype.isHolidayClosed = function isHolidayClosed (date) {
    if (this.holidayOpened) {
      return false;
    }
    return getHolidayName(date) !== null;
  };

  /**
   * *********************************************************
   *                       祝日の計算
   * *********************************************************
   */

  // キャッシュ
  var holidayCache = {};

  /**
   * 祝日名を取得
   * @method getHolidayName
   * @param  {Date|String} date
   * @return {String}      name
   */
  Koyomi.getHolidayName = getHolidayName;
  function getHolidayName (date) {
    date = toDate(date);
    var key = (date.getMonth() + 1) * 100 + date.getDate();
    var holidays = getHolidays(date.getFullYear());
    return holidays[key] || null;
  }

  /**
   * 祝日一覧を取得する
   * キーに日にち、値に祝日名が設定されたオブジェクトを返す
   * 
   *  {'101': '元日', '111': '成人の日', '211': '建国記念日', （省略...）
   * 
   * @method getHolidays
   * @param  {Number}   year
   * @return {Object}   holidays
   */
  Koyomi.getHolidays = getHolidays;
  function getHolidays(year) {
    var holidays = holidayCache[year];
    if (holidays) {
      return holidays;
    }

    // 祝日を計算し追加
    holidays = {};
    HOLIDAYS.forEach(function (item) {
      var h;
      switch (item) {
      case '春分の日':
        h = getShunbun(year);
        break;
      case '秋分の日':
        h = getShubun(year);
        break;
      default:
        h = parseHoliday(year, item);
        break;
      }
      if (h) {
        var key = h[0] * 100 + h[1];
        holidays[key] = h[2];
      }
    });

    // 振替休日を設定
    if (~HOLIDAYS.indexOf('振替休日')) {
      setFurikaeKyujitu(year, holidays);
    }

    // 国民の休日を設定
    if (~HOLIDAYS.indexOf('国民の休日')) {
      setKokuminNoKyujitu(year, holidays);
    }

    // キャッシュに保存
    holidayCache[year] = holidays;

    return holidays;
  }

  // 祝日定義の日にち部分の正規表現
  var REG_HOLIDAY = new RegExp('^(?:(\\d+)(-)?(\\d+)?\\/)?(\\d+)\\/(\\d+)(' +
                               WEEK_NAMES.join('|') + ')?$', 'i');

  /**
   * 祝日の定義から、祝日であれば日にちを返す。祝日でないならnullを返す
   *   例
   *     year    = 2016
   *     item    = '海の日 1996-2002/7/20  2003-/7/3Mon'
   *     holiday = [7, 18, '海の日']
   * 
   * @method parseHoliday
   * @param  {Number}     year
   * @param  {String}     item
   * @return {Array}      holiday
   */
  function parseHoliday(year, item) {
    var data = item.match(/(\S+)/g);
    var name = data[0];
    for(var i = 1; i < data.length; i++) {
      var m = data[i].match(REG_HOLIDAY);
      if (m) {
        var month = m[4] * 1;
        var from = m[1] * 1;
        var to = (m[3] || (m[2] ? year : from)) * 1;
        var day = m[6] ? getXDay(year, month, m[5], m[6]) : m[5] * 1;
        if (from <= year && year <= to) {
          return [month, day, name];
        }
      }
    }
    return null;
  }

  /**
   * 春分の日 (wikiの簡易計算より)
   * @method getShunbun
   * @param  {Number}   year
   * @return {Array}    shunbun
   */
  function getShunbun(year) {
    if (year < 1949 || 2099 < year) {
      return null;
    }
    var day;
    switch(year % 4) {
    case 0:
      day = year <= 1956 ? 21 : year <= 2088 ? 20 : 19;
      break;
    case 1:
      day = year <= 1989 ? 21 : 20;
      break;
    case 2:
      day = year <= 2022 ? 21 : 20;
      break;
    case 3:
      day = year <= 1923 ? 22 : year <= 2055 ? 21 : 20;
    }
    return [3, day, '春分の日'];
  }

  /**
   * 秋分の日 (wikiの簡易計算より)
   * @method getShubun
   * @param  {Number}  year
   * @return {Array}   shubun
   */
  function getShubun(year) {
    if (year < 1948 || 2099 < year) {
      return null;
    }
    var day;
    switch(year % 4) {
    case 0:
      day = year <= 2008 ? 23 : 22;
      break;
    case 1:
      day = year <= 1917 ? 24 : year <= 2041 ? 23 : 22;
      break;
    case 2:
      day = year <= 1946 ? 24 : year <= 2074 ? 23 : 22;
      break;
    case 3:
      day = year <= 1979 ? 24 : 23;
    }
    return [9, day, '秋分の日'];
  }

  /**
   * 振替休日を設定する
   * 施行: 1973/4/30-
   * @method setFurikaeKyujitu
   * @param  {Number}   year
   * @param  {Object}   holidays
   */
  function setFurikaeKyujitu(year, holidays) {
    if (year < 1973) {
      return;
    }
    var last = null;
    var furikae = [];
    var activeTime = new Date(1973, 4-1, 29).getTime(); // 施行前日の祝日から適用
    var flg = false;
    var keys = Object.keys(holidays);
    keys.push('1231');
    keys.forEach(function(md) {
      var date = new Date(year, md.slice(0, -2) * 1 - 1, md.slice(-2) * 1);
      if (flg) {
        last.setTime(last.getTime() + A_DAY);
        if (last.getTime() !== date.getTime()) {
          furikae.push((last.getMonth() + 1) * 100 + last.getDate());
          flg = false;
        }
      } else {
        flg = date.getDay() === 0 && activeTime <= date.getTime();
      }
      last = date;
    });
    furikae.forEach(function(x){
      holidays[x] = '振替休日';
    });
  }

  /**
   * 国民の休日を設定する
   * 施行: 1988-
   * @method setKokuminNoKyujitu
   * @param  {Number}   year
   * @param  {Object}   holidays
   */
  function setKokuminNoKyujitu(year, holidays) {
    if (year < 1988) {
      return;
    }
    var kokumin = [];
    var last = null;
    Object.keys(holidays).forEach(function(md) {
      var date = new Date(year, md.slice(0, -2) * 1 - 1, md.slice(-2) * 1);
      if (last){
        last.setTime(last.getTime() + A_DAY);
        if (last.getTime() + A_DAY === date.getTime()) {
          kokumin.push((last.getMonth() + 1) * 100 + last.getDate());
        }
      }
      last = date;
    });
    kokumin.forEach(function (x){
      if (x in holidays) { // 他の祝日や振替休日が優先される
        return;
      }
      holidays[x] = '国民の休日';
    });
  }


  /**
   * *********************************************************
   *                       年度
   * *********************************************************
   */
  
  /**
   * 年度の開始と終了の日時を取得する
   * @method getNendo
   * @param  {String|Date} date 含まれる日時 省略時は new Date()
   * @return {Object}      
   */
  Koyomi.prototype.getNendo = function getNendo (date) {
    date = date ? toDate(date) : new Date();
    if (!date) {
      return null;
    }

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var fm = this.startMonth;
    var tm = fm === 1 ? 12 : fm - 1;
    var fy = month < fm ? year - 1 : year;
    var ty = fm === 1 ? fy : fy + 1;

    var from = new Date(fy, fm - 1, 1,  0,  0,  0,   0);
    var to   = new Date(ty, tm,     0, 23, 59, 59, 999);

    return {from: from, to: to};
  };
  
  /**
   * 年度を表す表記を返します
   * @method formatNendo
   * @param  {[type]}  date       含まれる日時  既定値 new Date()
   * @param  {String}  fromFormat 開始年月のフォーマット 既定値 'Y/n'
   * @param  {String}  toFormat   終了年月のフォーマット 既定値 '-Y/n'
   *                                (ただし、fromFormatが設定時の規定値はnull)
   * @param  {Boolean} reverse    結合順を逆にする  規定値 false
   * @return {String} formatted
   */
  Koyomi.prototype.formatNendo = function formatNendo(date, fromFormat, toFormat, reverse) {
    var nendo = this.getNendo(date || new Date());

    var unsetFrom = arguments.length <= 1;
    var unsetTo = arguments.length <= 2;

    fromFormat = unsetFrom ? '{Y}/{n}' : fromFormat;
    toFormat = unsetTo ? (unsetFrom ? '-{Y}/{n}' : null) : toFormat;

    var from = fromFormat ? this.format(nendo.from, fromFormat) : '';
    var to = toFormat ? this.format(nendo.to, toFormat) : '';

    return reverse ? to + from : from + to;
  };

  /**
   * *********************************************************
   *                  カレンダーデータ
   * *********************************************************
   */

  /**
  * カレンダーデータ
  *
  * カレンダーを作成しやすい元データを提供します
  * 開始曜日を指定するとゴースト日を追加します
  *
  * ゴースト日とは、
  *   1日以前を日を週のはじめまで埋めるための日データと
  *   末日以後の日を週の終わりまで埋めるための日データの２つを表します
  *   カレンダーでは通常、薄いグレーなど影を薄くするため造語として
  *   ゴースト日と命名しました
  * 
  * dataの各要素のプロパティ
  *   som    : 月のはじめ (start of month)
  *   eom    : 月の終わり (end of month)
  *   year   : 年
  *   month  : 月
  *   day    : 日
  *   week   : 曜日 0:日->6:土
  *   opened : 営業日ならtrue
  *   closed : 休業理由(祝日、休業日、定休日) 休業でないなら空文字
  *   holiday: 祝日名、祝日ではない場合は空文字
  * 以下はstartWeek=null時は出力されません
  *   sow    : 週のはじめ (start of week)   
  *   eow    : 週の終わり (end of week)
  *   ghost  : ゴースト日はtrue
  *   block  : 月ブロックのキー '2015/01'
  *   weekNumber: 週番号
  *
  * @method getCalendarData
  * @param  {Number|String} range     期間     2015, '2015/4' 2015/4-2016/3'
  *                                            既定値 プロパティの`startMonth`に設定された
  *                                                   月から、本日が含まれる年度の期間
  * @param  {String}        startWeek 開始曜日 既定値 プロパティのstartWeek
  *                                            nullを明示的に設定しないかぎり、
  *                                            ゴースト日のデータが追加され、
  *                                            sow/eow/ghost/blockのプロパティが追加されます
  * @param  {Boolean}       six       6週取得  6週分までゴースト日を追加します
  *                                            既定値 プロパティのsix 変更がない場合はtrue
  *                                       
  * @return {Array.Object}  data 
  */
  Koyomi.prototype.getCalendarData = function getCalendarData(range, startWeek, six) {
    var koyomi = this;
    var year;
    var month;
    var endYear;
    var endMonth;
    if (typeof range === 'number' || /^\d{1,4}$/.test(range)) {
      // 年を指定
      year = range * 1;
      month = 1;
      endYear = range * 1;
      endMonth = 12;
    } else if (typeof range === 'string') {
      // 範囲を指定
      var REG_RANGE = /^(\d{1,4})\D+(\d{1,2})(?:\D+(\d{1,4})\D+(\d{1,2}))?$/;
      var m = range.match(REG_RANGE);
      if (m) {
        year = m[1] * 1;
        month = m[2] * 1;
        endYear =  (m[3] || m[1]) * 1;
        endMonth = (m[4] || m[2]) * 1;
      } else {
        return null;
      }
    } else {
      // 既定値 年度を取得
      var nendo = this.getNendo();
      year = nendo.from.getFullYear();
      month = nendo.from.getMonth() + 1;
      endYear = nendo.to.getFullYear();
      endMonth = nendo.to.getMonth() + 1;
    }

    // 週のはじめと終わりのインデックス
    var sw = startWeek === undefined ? getWeekIndex(koyomi.startWeek) : // 既定値
             startWeek === null ? null : getWeekIndex(startWeek);
    var ew = sw === null ? null : sw === 0 ? 6 : sw - 1;

    // 6週取得
    six = six !== undefined ? six : koyomi.six;

    // 戻り値
    var data = [];

    var weekNumber = 1;
    var weekNumberPlus;

    // 月データ処理のループ
    while(year*100 + month <= endYear * 100 + endMonth) {

      // 月データの範囲   day: 開始日, endDay: 終了日
      var day = new Date(year, month - 1, 1);
      var week = day.getDay();
      if (sw !== null) {
        day = new Date(year, month - 1, sw - week - (sw <= week ? -1 : 6));
      }
      var endDay = new Date(year, month, 0);
      if (six && sw !== null) {
        endDay = new Date(day.getTime() + A_DAY * 41);
      } else if (sw !== null) {
        var endWeek = endDay.getDay();
        endDay = new Date(year, month, sw - endWeek + (sw <= endWeek ? 6 : -1));
      }

      var som = true;
      weekNumberPlus = 0;

      // 日データ処理のループ
      while(true) {
        var r = koyomi.format(day, '{Y}|{n}|{j}|{w}|{closed}|{holiday}').split('|');
        var item = {
          som    : som,      // whileに入った直後だけtrue
          eom    : false,    // whileを抜ける直前だけtrue
          year   : r[0] * 1,
          month  : r[1] * 1,
          day    : r[2] * 1,
          week   : r[3] * 1,
          opened : !r[4],
          closed : r[4],
          holiday: r[5]
        };
        som = false;
        // 週の始まりが指定されている時のみ設定
        if (sw !== null) {
          item.sow = sw === r[3] * 1;
          item.eow = ew === r[3] * 1;
          item.ghost = item.month !== month;
          item.block = year + '/' + ('0' + month).slice(-2);
          if (item.sow) {
            if (!item.ghost) {
              weekNumber++;
            } else if (!item.som) {
              weekNumberPlus++;
            }
          }
          item.weekNumber = weekNumber + weekNumberPlus;
        }
        data.push(item);
        if (day.getTime() === endDay.getTime()) {
          item.eom = true;
          break;
        }
        day.setTime(day.getTime() + A_DAY);
      }

      month = 12 <= month ? 1 : month + 1;
      year = month === 1 ? year + 1 : year;
    }
    return data;
  };

  /**
   * *********************************************************
   *                       補助関数
   * *********************************************************
   */


  /**
   * Dateオブジェクトを作成
   *
   * 次の3つの方法で指定できる
   *   1, Dateオブジェクト
   *   2, 文字列     Date.parseが理解できる
   *   3, 配列       [年, 月, 日, 時, 分, 秒, ミリ秒]
   *                    月以降省略した場合は、その部で最初の数値が適用されます
   * 
   * 文字列からDateに対応
   * 和暦から西暦にも対応
   * @method toDate
   * @param  {Date|String|Array} value
   * @param  {Boolean}           trim    時以下を切り捨てる
   * @param  {Boolean}           clone
   * @return {Date}              date
   */
  Koyomi.toDate = toDate;
  function toDate(value, trim, clone) {
    if (!value) {
      return null;

    } else if (value instanceof Date) {
      if (!trim && clone) {
        value = new Date(value.getTime());
      }

    } else if (typeof value === 'string') {
      // 和暦時西暦に変換
      value = value.replace(REG_NENGO, function(x, n, y, m, d) {
        var idx = parseInt(NENGO_NAMES.indexOf(n) / 2, 10);
        return (NENGO[idx].y + y * 1 - 1) + '-' + m + '-' + d;
      });
      value = new Date(value);

    } else if (Array.isArray(value)) {
      var v = [0, 1, 1, 0, 0, 0, 0];
      value.forEach(function(x, i){v[i] = x;});
      value = new Date(v[0], v[1] - 1, v[2], v[3], v[4], v[5], v[6]);

    } else if (typeof value === 'object' && 'year' in value && 'month' in value && 'day' in value) {
      value = new Date(value.year, value.month - 1, value.day);

    } else {
      return null;
    }
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    if (trim) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    return value;
  }


  /**
   * 週の文字列からインデックスを返す
   * 配列を渡した場合は、配列で返す
   * 判別できる週の文字列がひとつもない場合はnullを返す
   * カンマ区切りの文字列は配列で返す
   *
   * '日' -> 0,  'sat' -> 6, ['月', '火', '休'] -> [1, 2] 
   * '祝' -> null, ['休', '祝'] -> null
   * '土,日' -> [6, 0]
   * 
   * @method getWeekIndex
   * @param  {String|Array} week
   * @return {String|Array} index
   */
  Koyomi.getWeekIndex = getWeekIndex;
  function getWeekIndex (week) {
    if (!week) {
      return null;
    }

    if (Array.isArray(week)) {
      var idxes = week.map(function(w){
              return WEEK_NAMES.indexOf(w.trim().toLowerCase()) % 7;
            }).filter(function(x){return ~x;});
      return  idxes.length ? idxes : null;

    } else if (typeof week === 'string') {
      if (~week.indexOf(',')) {
        return getWeekIndex(week.split(',').map(function(x){return x.trim();}));
      }
      var idx =  WEEK_NAMES.indexOf(week.toLowerCase()) % 7;
      return idx === -1 ? null : idx;
    }
    return null;
  }


  // 月日の期間の正規表現
  var REG_DATE_LIST = /^(\d{1,2})\/(\d{1,2})(?:-(\d{1,2})\/(\d{1,2}))?$/;

  // 存在しない日付
  var REMOVE_DATE = [230, 231, 431, 631, 931, 1131];

  /**
   * 文字列から月日の配列を作成する
   *
   * '12/29-1/3, 8/16-8/18, 10/10'
   *     -> [1229, 1230, 1231, 101, 102, 103, 816, 817, 818, 1010] 
   * @method getDateArray
   * @param  {String}     value
   * @return {Array}
   */
  Koyomi.getDateArray = getDateArray;
  function getDateArray(value) {
    var result = [];
    value.split(',').forEach(function(s){
      var m = s.trim().match(REG_DATE_LIST);
      if (m && m[3]) {
        var m1 = m[1] * 1;
        var d1 = m[2] * 1;
        var m2 = m[3] * 1;
        var d2 = m[4] * 1;
        if (m2 < m1) {
          m2 += 12;
        }
        while(m1 * 100 + d1 <= m2 * 100 + d2) {
          result.push((12 < m1 ? m1 - 12 : m1) * 100 + d1);
          if (31 <= d1) {
            m1++;
            d1 = 1;
          } else {
            d1++;
          }
        }
      } else if (m) {
        result.push(m[1]*100 + m[2]*1);
      }
    });
    return result.filter(function (x) {
      return !~REMOVE_DATE.indexOf(x);
    });
  }

  /**
   * 第x week曜日の日にちを返す
   * @method getXDay
   * @param  {Number} year
   * @param  {Number} month
   * @param  {Number} x      5以上を指定した場合は最終の指定曜日の日とします
   * @param  {String} week   Sun/Mon/Tue/Wed/Thu/Fri/Sat
   * @return {Number} day
   */
  Koyomi.getXDay = getXDay;
  function getXDay(year, month, x, week) {
    var w = WEEK_NAMES.indexOf(week.toLowerCase()) % 7; // 曜日のインデックス
    if (w === -1) {
      return null;
    }
    var f = new Date(year, month - 1, 1).getDay();      // 1日のインデックス
    var d1 = 1 + w - f + (w < f ? 7 : 0);               // 第1の日にち
    if (4 < x) {                                        // 最終週の場合
      var days = (new Date(year, month, 0)).getDate();
      x = parseInt((days - d1) / 7, 10) + 1;
    }
    return d1 + (x - 1) * 7;                            // 第xの日にち
  }

  /**
   * 年号オブジェクトの取得
   * @method getNengo
   * @param  {Date|String} date
   * @param  {Boolean}     daily  true時は日付で年号の境を判定。falseでは年単位
   * @return {Object}      nengo
   */
  Koyomi.getNengo = getNengo;
  function getNengo (date, daily) {
    date = toDate(date);
    var seireki = NENGO[NENGO.length - 1];
    var Y = date.getFullYear();
    // 日本でのグレゴリオ歴の導入は1873年（明治6年）以降。明治の元年〜5年は西暦を返す
    if (Y < 1873) {
      return seireki;
    }
    for(var i = 0, len = NENGO.length; i < len; i++) {
      var item = NENGO[i];
      if (daily && item.d <= date || !daily && item.y <= Y) {
        return item;
      }
    }
    return seireki;
  }

  /**
   * 週番号を取得
   * @method getWeekNumber
   * @param  {Date}   date
   * @param  {String} week   週の始まりの曜日 既定値 Mon
   * @param  {Number} month  始まりの月       既定値 1    ※1月 -> 1
   * @return {Number} weekNumber
   */
  Koyomi.getWeekNumber = getWeekNumber;
  function getWeekNumber (date, week, month) {
    date = toDate(date, true);
    week = typeof week === 'number' ? week : week ? getWeekIndex(week) : 1;
    if (week === null) {
      return null;
    }
    month = month ? month - 1 : 0;
    var y = date.getFullYear();
    var m = date.getMonth();
    y = m < month ? y - 1 : y;                // 年度の補正
    var dx1 = new Date(y, month, 1);          // x月1日
    var plus = (dx1.getDay() + 7 - week) % 7; // x日1日の前の日数 
    var days = (date - dx1) / A_DAY + plus;   // そこからのdateまでの日数
    return Math.floor(days / 7) + 1;
  }

  /**
   * 週番号を取得
   * ３つの引数を渡した場合は、年月日を渡したものと判定します
   * @method getWeekNumber
   * @param  {Date|String|Number}  date/year
   * @param  {Number}              month    1月 -> 1
   * @param  {Number}              day
   * @return {Number}              weekNumber
   */
  Koyomi.prototype.getWeekNumber = function getWeekNumber2 (date) {
    if (arguments.length === 3) {
      date = new Date(arguments[0], arguments[1] - 1, arguments[2]);
    }
    return getWeekNumber(date, this.startWeek, this.startMonth);
  };

  /**
   * 漢数字変換
   * 年、月、日の数字を漢数字に変更します
   * 0-9999以外は空文字を返します
   * 第二引数(既定値:false)による動作の違いは以下のとおり
   *
   *        3    10    15    20     24      63        1998        2000      2015
   * false: 三   十   十五  二十  二十四  六十三  千九百九十八    二千    二千十五
   * true : 三  一〇  一五  二〇   二四    六三    一九九八     二〇〇〇  二〇一五
   * 
   * @method kan
   * @param  {Number}  num
   * @param  {Boolean} shrt
   * @return {String}  kansuji
   */
  Koyomi.kan = kan;
  function kan (num, shrt) {
    // イレギュラー
    if (typeof num !== 'number') {
      return '';
    }
    if (num === 0) {
      return '〇';
    } else if (num < 0 || 9999 < num) {
      return '';
    }

    if (shrt) {
      return ('' + num).split('').map(function(x){
        return x === '0' ? '〇' : JNUM[x * 1];
      }).join('');
    }

    var kurai = ('0000' + num).slice(-4).split('');
    var s = kurai[0] * 1;
    var h = kurai[1] * 1;
    var j = kurai[2] * 1;
    var i = kurai[3] * 1;

    return (s === 0 ? '' : s === 1 ? '千' : JNUM[s] + '千') +
           (h === 0 ? '' : h === 1 ? '百' : JNUM[h] + '百') +
           (j === 0 ? '' : j === 1 ? '十' : JNUM[j] + '十') +
           (i === 0 ? '' : JNUM[i]);
  }

  return Koyomi;
})();

// node時
if (typeof module === 'object' && typeof exports === 'object') {
  module.exports = exports = Koyomi;
}