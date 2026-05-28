// Pillar 7 — Manufacturing (The Hands)
// Self-reflection prompts for hub builders worldwide.
// 7 layers (Survival → Innovation) × 4 phases (none/survive/build/scale).
export default {
  0: { // Survival — grid down, zero prep, today
    qdesc: 'Grid goes down right now. Something in your house breaks and you need a part that no store can sell you. What could you actually make or fix today?',
    none:    'You have not pictured this scenario for making or repairing things yet.',
    survive: 'You could bodge something with tape, wire, glue, and whatever scrap is in the garage, and it might hold for a while.',
    build:   'You can carve, bend, patch, and improvise replacement parts from materials already on the property, and the fix lasts.',
    scale:   'You could walk a panicked neighbour through repairing their broken pump, hinge, or handle today with what is already in their house.',
  },
  1: { // Preparedness — kit built, tested, ready
    qdesc: 'Have you assembled and actually used a real workshop kit — hand tools, power tools, fasteners, adhesives — before you need it in anger?',
    none:    'No deliberate tool kit beyond a drawer of mismatched basics.',
    survive: 'A toolbox somewhere with a hammer, a screwdriver, and some duct tape; you have not used most of it.',
    build:   'A full set of hand and power tools you know intimately, organised, sharpened, with spare blades and batteries on hand.',
    scale:   'Your workshop is what neighbours come to look at before they build theirs.',
  },
  2: { // Stockpile — raw materials that hold or appreciate in a crunch
    qdesc: 'Are you holding raw making materials — filament, resin, steel stock, welding consumables, fasteners, bearings — that would jump in value when supply chains tighten?',
    none:    'Nothing put aside specifically for making things beyond the odd box of screws.',
    survive: 'A spool or two of filament, a few welding rods, a jar of mixed fasteners; nothing organised.',
    build:   'Sealed bins of filament and resin, stock metal, full fastener assortments, and a sense of what each piece is worth in a pinch.',
    scale:   'You hold enough raw stock to keep your whole street making and repairing, and traders know to come to you.',
  },
  3: { // Production — you make goods for the other pillars
    qdesc: 'Are you making physical parts for the other pillars — filter housings, antenna mounts, solar brackets, hydroponic pots — that work well enough to hand to a stranger?',
    none:    'You do not produce parts for anyone, including yourself.',
    survive: 'A few printed or fabricated parts you made for your own gear, rough and untested by anyone else.',
    build:   'Tested parts going out in low single digits per month to friends and neighbours, and the things they fit keep working.',
    scale:   'Parts going out at volume across multiple pillars — production runs without you watching every step.',
  },
  4: { // Commerce — you curate and sell to others
    qdesc: 'Are you curating and selling making goods to people beyond yourself — printers, tools, fasteners, custom parts — through your own catalog, market stall, or online store?',
    none:    'No making-related listings or sales channels live.',
    survive: 'A handful of items posted locally; one or two have sold.',
    build:   'A real catalog with regular orders; customers come back for more fasteners, filament, or custom jobs.',
    scale:   'Multi-channel storefront with predictable monthly revenue and inventory you can re-supply.',
  },
  5: { // Teaching — knowledge transfer, the highest-margin product
    qdesc: 'Are you teaching making knowledge — printing classes, welding workshops, repair clinics, written guides, or hands-on consulting?',
    none:    'Not teaching anyone how to make or fix things yet.',
    survive: 'Showed a friend how to use a tool once; never charged.',
    build:   'Regular paid classes, repair clinics, or one-on-one consultations on the calendar.',
    scale:   'Your curriculum is packaged so other people can teach it; you have trained instructors or franchised the format.',
  },
  6: { // Innovation — category-defining work
    qdesc: 'Are you working on a category-defining making innovation — voice-to-object printing, self-replicating printer fleets, AI parts identification, or something nobody is shipping yet?',
    none:    'No making R&D underway.',
    survive: 'An idea sketched on a napkin; you are experimenting at the edges.',
    build:   'A working prototype proving the concept in real conditions.',
    scale:   'Your innovation is shipping, gaining adoption, and venture-scale outcomes are realistic.',
  },
};
