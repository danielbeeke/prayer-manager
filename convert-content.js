const data = require('./old-content.js')
const fs = require('fs')
const jsonLdPrayers = {}

const categoryMapping = {
  'Morning prayer': 'MorningPrayer',
  'Evening Prayers': 'EveningPrayer',
  'Confession': 'ConfessionPrayer',
  'Opening/invocation': 'OpeningPrayer',
  'Miscellaneous': 'MiscellaneousPrayer',
  "The Lord's Prayer": 'PrayersFromTheBible',
  'The Jesus Prayer': 'JesusPrayer',
  'Table Graces': 'MealPrayer',
  'Ave Maria': 'AveMaria'
}

const authors = {
  'by Thérèse of Lisieux': 'http://dbpedia.org/resource/Th%C3%A9r%C3%A8se_of_Lisieux',
  'by George Washington': 'http://dbpedia.org/resource/George_Washington',
  'Eastern Church': 'http://dbpedia.org/resource/Eastern_Orthodox_Church',
  'by Sören Kierkegaard': 'http://dbpedia.org/resource/S%C3%B8ren_Kierkegaard',
  'by Sören Kierkgaard': 'http://dbpedia.org/resource/S%C3%B8ren_Kierkegaard',
  'by St. Augustine': 'http://dbpedia.org/resource/Augustine_of_Hippo',
  'Book of Common Prayer': 'http://dbpedia.org/resource/Book_of_Common_Prayer',
  'from the Liturgy of St. James': 'http://dbpedia.org/resource/Eastern_Orthodox_Church',
  'by Ambrose': 'http://dbpedia.org/resource/Ambrose',
  'by Nerses of Clajes': 'http://dbpedia.org/resource/Nerses_IV_the_Gracious',
  'Adapted from the Book of Common Prayer': 'http://dbpedia.org/resource/Book_of_Common_Prayer',
  'by Gregory the Great': 'http://dbpedia.org/resource/Pope_Gregory_I',
  'by Myles Coverdale, Bishop of Exeter, 1530 A.D.': 'http://dbpedia.org/resource/Myles_Coverdale',
  'by (Saint) Augustine of Hippo, 398 A.D.': 'http://dbpedia.org/resource/Augustine_of_Hippo',
  'by Jane Austen': 'http://dbpedia.org/resource/Jane_Austen',
  'from a prayer by St. Clement of Rome': 'http://dbpedia.org/resource/Pope_Clement_I',
  'by (St.) Nersess the Gracious, 12th century': 'http://dbpedia.org/resource/Nerses_IV_the_Gracious',
  'from the Clementine Liturgy': 'http://dbpedia.org/resource/Pope_Clement_I',
  'By Iranaeus, Old Gallican Sacramentary': 'http://dbpedia.org/resource/Irenaeus',
  'from The Book of Common Prayer': 'http://dbpedia.org/resource/Book_of_Common_Prayer',
  'Ascribed to St. Francis': 'http://dbpedia.org/resource/Francis_of_Assisi',
  'By Nerses of Clajes': 'http://dbpedia.org/resource/Nerses_IV_the_Gracious',
  'By St. Augustine': 'http://dbpedia.org/resource/Augustine_of_Hippo',
  'From a prayer by St. Therese of Lisieux': 'http://dbpedia.org/resource/Th%C3%A9r%C3%A8se_of_Lisieux',
  'by Anne Bronte': 'http://dbpedia.org/resource/Anne_Bront%C3%AB',
  'by St. Therese of Lisieux': 'http://dbpedia.org/resource/Th%C3%A9r%C3%A8se_of_Lisieux',
  'By St. Francis': 'http://dbpedia.org/resource/Francis_of_Assisi',
  'by Teresa of Ávila': 'http://dbpedia.org/resource/Teresa_of_%C3%81vila',
  'by Basil': 'http://dbpedia.org/resource/Basil_of_Caesarea',

  // Wikipedia only
  /*
  'adapted from a prayer by A. W. Tozer': 'https://en.wikipedia.org/wiki/A._W._Tozer',
  'From the Liturgy of Mark, 2d Century A.D.': 'https://en.wikipedia.org/wiki/Liturgy_of_Saint_Cyril',
  'by J.G. Whittier': 'https://en.wikipedia.org/wiki/John_Greenleaf_Whittier',
  'by Ruth M. Fox': 'https://en.wikipedia.org/wiki/Ruth_May_Fox',
  'from the Liturgy of St. Chrysostom': 'https://en.wikipedia.org/wiki/Liturgy_of_Saint_John_Chrysostom',

  'Apostolic Constitutions': 'Apostolic Constitutions',
  'from an Ancient Collect': 'from an Ancient Collect',
  'from the Mozarabic Breviary': 'from the Mozarabic Breviary',
  'Translation of a prayer (in Greek) from ca.150 A.D.': 'Translation of a prayer (in Greek) from ca.150 A.D.',
  'Translated from an old French prayer, ca. 1880': 'Translated from an old French prayer, ca. 1880',
  'From the Old Gallican Sacramentary': 'From the Old Gallican Sacramentary',
  'From the Gallican Sacramentary': 'From the Gallican Sacramentary',
  'by Peter Marshall': 'by Peter Marshall' */
}


for (const category of data.Categories) {
  for (const prayer of data[category.Title]) {
    const jsonLdPrayer = {
      "@context": {
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "prayer": "http://rdf.danielbeeke.nl/prayer/prayer-dev.ttl#",
        "owl": "http://www.w3.org/2002/07/owl#",
        "dcterms": "http://purl.org/dc/terms/",
        "vann": "http://purl.org/vocab/vann/",
        "form": "http://rdf.danielbeeke.nl/form/form-dev.ttl#",
        "prayerForm": "http://rdf.danielbeeke.nl/prayer/prayer.form.ttl#"
      },
      "prayer:author": authors[prayer.Author] ? { '@id': authors[prayer.Author]} : { '@value': prayer.Author},
      "prayer:category": "http://rdf.danielbeeke.nl/prayer/prayer-dev.ttl#" + categoryMapping[category.Title],
      "prayer:content": prayer.Content,
      "prayer:title": prayer.Title
    }

    let cleanTitle = prayer.Title
    let title = prayer.Title
    let index = 1

    while (jsonLdPrayers[title]) {
      index++
      title = cleanTitle + ' (' + index + ')'
    }

    jsonLdPrayers[title] = jsonLdPrayer

    fs.writeFileSync('./prayers/' + title + '.jsonld', JSON.stringify(jsonLdPrayer, null, 2))
  }
}
