import _ from 'lodash'
import * as wordJSON from './words.json'

export function buildLanguageDatabase() {
  const all = wordJSON
  const verbs = wordJSON.filter((w) => w.type == 'verb')
  const commonNouns = wordJSON.filter((w) => w.type == 'common noun')
  const properNouns = wordJSON.filter((w) => w.type == 'proper noun')
  const allNouns = commonNouns.concat(properNouns)
  const verbTenses = wordJSON.filter((w) => w.type == 'tense')
  const pronouns = wordJSON.filter((w) => w.type == 'pronoun')
  const numbers = wordJSON.filter((w) => w.type == 'number')

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
    word: {
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
