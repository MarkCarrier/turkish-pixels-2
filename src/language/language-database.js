import _ from 'lodash'
import * as wordJSON from './words.json'

export function buildLanguageDatabase() {
  const all = wordJSON.words
  const verbs = all.filter((w) => w.type == 'verb')
  const commonNouns = all.filter((w) => w.type == 'common noun')
  const properNouns = all.filter((w) => w.type == 'proper noun')
  const allNouns = commonNouns.concat(properNouns)
  const verbTenses = all.filter((w) => w.type == 'tense')
  const pronouns = all.filter((w) => w.type == 'pronoun')
  const numbers = all.filter((w) => w.type == 'number')

  const getVerbByEnglishText = (english) => {
    return _.find(verbs, (v) => v.english == english)
  }

  const getVerbTenseByEnglishName = (english) => {
    return _.find(verbTenses, (vt) => vt.english == english)
  }

  const getVerbByTurkishText = (turkish) => {
    return _.find(verbs, (v) => v.turkish == turkish)
  }

  return {
    words: {
      all,
      verbs,
      commonNouns,
      properNouns,
      allNouns,
      verbTenses,
      pronouns,
      numbers
    },
    getVerbByEnglishText,
    getVerbTenseByEnglishName,
    getVerbByTurkishText
  }
}
