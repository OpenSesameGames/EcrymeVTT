
export const ECRYME_CONFIG = {

  traitTypes: {
    normal: "Normal", 
    spleen: "Spleen",
    ideal: "Ideal"
  },
  weaponTypes: {
    "melee": "ECRY.ui.melee",
    "ranged": "ECRY.ui.ranged"
  },
  traitLevel: [
    {value: -3, text: "-3"},
    {value: -2, text: "-2"},
    {value: -1, text: "-1"},
    {value: +1, text: "+1"},
    {value: +2, text: "+2"},
    {value: +3, text: "+3"}
  ],
  impactTypes: {
    physical: "ECRY.ui.physical",
    mental: "ECRY.ui.mental",
    social: "ECRY.ui.social"
  },
  impactLevels: {
    superficial: "ECRY.ui.superficial",
    light: "ECRY.ui.light",
    serious: "ECRY.ui.serious",
    major: "ECRY.ui.major"
  },
  difficulty: {
    "-1": {difficulty: "ECRY.ui.none", frequency: "ECRY.ui.none", value: "-"},
    "8": { difficulty: "ECRY.ui.troublesome", frequency: "ECRY.ui.occasional", value: 8 },
    "10": { difficulty: "ECRY.ui.difficult", frequency: "ECRY.ui.uncommon", value: 10 },
    "12": { difficulty: "ECRY.ui.verydifficult", frequency: "ECRY.ui.rare", value: 12 },
    "14": { difficulty: "ECRY.ui.extremdifficult", frequency: "ECRY.ui.veryrare", value: 14 },
    "16": { difficulty: "ECRY.ui.increddifficult", frequency: "ECRY.ui.exceptrare", value: 16 },
  },
  skillLevel: {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10"
  },
  costUnits: {
    "ingot": {name: "ECRY.ui.ingot", value: 100000},
    "ingotin": {name: "ECRY.ui.ingotin", value: 10000},
    "goldcoin": {name: "ECRY.ui.goldcoin", value: 1000 },
    "lige": {name: "ECRY.ui.lige", value: 100 },
    "hurle": {name: "ECRY.ui.hurle", value: 10 },
    "coin": {name: "ECRY.ui.coin", value: 1 }
  }

}