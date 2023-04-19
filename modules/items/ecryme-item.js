import { MaleficesUtility } from "./malefices-utility.js";

export const defaultItemImg = {
  arme: "systems/fvtt-malefices/images/icons/arme.webp",
  equipement: "systems/fvtt-malefices/images/icons/equipement.webp",
  elementbio: "systems/fvtt-malefices/images/icons/wisdom.webp",
  archetype: "systems/fvtt-malefices/images/icons/archetype.webp",
  tarot: "systems/fvtt-malefices/images/icons/tarot.webp",
  sortilege: "systems/fvtt-malefices/images/icons/sortilege.webp",
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class MaleficesItem extends Item {

  constructor(data, context) {
    if (!data.img) {
      data.img = defaultItemImg[data.type];
    }
    super(data, context);
  }

}
