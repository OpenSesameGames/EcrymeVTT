import { EcrymeUtility } from "../common/ecryme-utility.js";

export const defaultItemImg = {
  weapon: "systems/fvtt-ecryme/images/icons/icon_weapon.webp",
  equipment: "systems/fvtt-ecryme/images/icons/icon_equipment.webp",
  contact: "systems/fvtt-ecryme/images/icons/icon_contact.webp",
  boheme: "systems/fvtt-ecryme/images/icons/icon_boheme.webp",
  trait: "systems/fvtt-ecryme/images/icons/icon_trait.webp",
  annency: "systems/fvtt-ecryme/images/icons/icon_annency.webp",
  skill: "systems/fvtt-ecryme/images/icons/icon_skill.webp",
  specialization: "systems/fvtt-ecryme/images/icons/icon_spec.webp"
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class EcrymeItem extends Item {

  constructor(data, context) {
    if (!data.img) {
      data.img = defaultItemImg[data.type];
    }
    super(data, context);
  }

}
