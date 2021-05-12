export class ChangeFileds {
    description: string ;
    change : boolean;
}

export class ChangeTypes {
    name: string ;
    fields: ChangeFileds[] = new Array();
}
  
export class Settings {
    settings: Array<ChangeTypes> = [
        {name : "Convert Book to a Article:",
        fields : [
            {description :"Title -> Journal title", change :false},
            {description :"Title -> Article\\Chapter title",change :true },
            {description :"Chapter title -> Article\\Chapter title", change :false},
            {description :"Chapter author -> Author",  change :true},
            {description :"ISBN -> ISSN",  change :true},
            {description :"Chapter number -> Chapter", change : true},
            {description :"Volume (split by comma) -> Volume & Issue",  change :true},
            {description :"Part -> (append) Volume",  change :true}
        ]},
        {name :"Convert Article to a Book:", 
        fields : [
            {description :"Article\\Chapter title -> Title",change :true },
            {description :"Journal title -> Title", change : false},
            {description :"ISSN -> ISBN",  change :true},
            {description :"Volume & Issue -> Volume(join with comma)",  change :true},
            {description :"Chapter -> Chapter number", change : true}
        ]}
    ]
}

