// ==UserScript==
// @name        WK Custom Review Question (KunOn+)
// @namespace   WK_CustomQuestion
// @description Changes the text of the Review or Lesson Quiz question. Specifies ON or KUN reading for Kanji. Options to have the text in English or Japanese.
// @author      hoovard
// @include     https://www.wanikani.com/review/session*
// @include     http://www.wanikani.com/review/session*
// @include     https://www.wanikani.com/lesson/session*
// @include     http://www.wanikani.com/lesson/session*
// @version     0.4.3
// @license     Do what you want with it (Preferably improve it).
// @grant       none
// ==/UserScript==
// Version 0.4.3 applies to Reviews and Lesson Quizzes.

// Language options
// English "en", Japanese "ja"
var strLang = 'en';

// Tested on the following:
// Firefox 35.0.1 and Chrome 39.0.2171.95 (64-bit), Linux Mint 17.1 Cinnamon 64-bit
// Firefox 35.0.1 and Chrome 40.0.2214.115 m, Windows 8.1 64-bit

// Thanks to Rui Pinheiro (LordGravewish) for the original script
// and to Ethan for the idea to use MutationObserver to detect changes in the DOM.

// Vars to compose the replacement question string
var strKanji;
var strRadical;
var strVocab;
var strMeaning;
var strReading;
var strVocabReading;
var strOn;
var strKun;
var strNan;
var strName;

// Translations
switch (strLang) {
  case 'en':
    strKanji = 'kanji';
    strRadical = 'radical';
    strVocab = 'vocabulary';
    strMeaning = 'meaning';
    //strReading = "yomi";
    strVocabReading = 'reading';
    strOn = "on'yomi";
    strKun = "kun'yomi";
    strNan = 'nanori';
    strName = 'name';
    break;
  case 'ja':
    strKanji = '漢字';
    strRadical = '部首';
    strVocab = '単語';
    strMeaning = '意味';
    //strReading = "読み";
    strVocabReading = '読み';
    strOn = '音読み';
    strKun = '訓読み';
    strNan = '名乗り';
    strName = '名前';
    break;
}

// Variable to save and check against the previous contents of the jStorage item
var objSavedCurrentItem;

// Review or Lesson Quiz. jStorage objects are different.
bIsReview = $(location).attr('href').indexOf('review') != -1;

// Code based on Stack Overflow to detect changes in the DOM.
// (http://stackoverflow.com/questions/3219758/detect-changes-in-the-dom/14570614#14570614)
var observeDOM = (function () {
  var MutationObserver = window.MutationObserver;

  return function (obj, callback) {
    if (MutationObserver) {
      // define a new observer
      var obs = new MutationObserver(function (mutations, observer) {
        callback();
      });
      // have the observer observe for changes in children
      // need to observe attributes because after we alter the question, wanikani will
      // not update the question text in certain circumstances and instead only changes the class
      // because WK uses regex to do a replacement on the text which results in no change if the
      // text does not have the string WK is searching for (this behavior occurs in lesson quiz)
      obs.observe(obj, { childList: true, attributes: true, subtree: true });
    }
  };
})();

// Callback function observing the 'question-type' div 'h1' element
var selector = '#question-type h1';
var observeMe = $(selector); // on review page
if (observeMe.length == 0) {
  // on lesson quiz page
  selector = '#question-type';
  observeMe = $(document); // on lessons page, selector isn't in dom on page load
}
observeMe = observeMe[0];
let in_call = false;
observeDOM(observeMe, function () {
  let el = $(selector);
  if (el.length == 0) return;

  var objCurItem;
  if (bIsReview) {
    objCurItem = $.jStorage.get('currentItem');
  } else {
    objCurItem = $.jStorage.get('l/currentQuizItem');
  }

  var strQuestionType;
  if (bIsReview) {
    strQuestionType = $.jStorage.get('questionType');
  } else {
    strQuestionType = $.jStorage.get('l/questionType');
  }

  var strItemType = '';
  var strReadingType = 'Reading';

  // Compose the string elements to be sent into the h1 element
  if ('kan' in objCurItem) {
    // Kanji
    strItemType = strKanji;
    if (strQuestionType == 'reading') {
      if (objCurItem.emph == 'onyomi') strReadingType = strOn;
      else if (objCurItem.emph == 'kunyomi') strReadingType = strKun;
      else if (objCurItem.emph == 'nanori') strReadingType = strNan;
    } else {
      strReadingType = strMeaning;
    }
  } else if ('voc' in objCurItem) {
    // Vocabulary
    strItemType = strVocab;
    if (strQuestionType == 'reading') {
      strReadingType = strVocabReading;
    } else {
      strReadingType = strMeaning;
    }
  } else if ('rad' in objCurItem) {
    // Radical
    strItemType = strRadical;
    strReadingType = strName;
  }

  // replace the contents of #question-type h1
  let newContents;
  switch (strLang) {
    case 'en':
      newContents = strItemType + ' <strong>' + strReadingType + '</strong>';
      break;
    case 'ja':
      newContents = strReadingType;
      break;
  }

  // Prevent responding to own DOM changes
  // triggers fewer mutationobservers compared to
  // previous way of doing this
  if (newContents != el.html()) {
    $(selector).html(newContents);
  }
});
