# Carpenter which create custom products
This document defines the functional requirements for a software system for the production management and planning of a joinery (carpentry workshop) specializing in the custom-made production of furniture for various environments.
The main objective is to create an integrated solution that makes it possible to monitor the company's production capacity, plan personnel activities (considering absences and holidays/leave), and estimate customer delivery dates—at least on a weekly basis, but preferably with precision (to the exact date).

The concept of this software is based on multiple levels of production plan, three levels, first long term (3-18 months), second (1-3 months) more detailed, third (1-4 weeks) with more details. Set one project/order in different level, show different stuff in the same view. 

## 1.Stack tech

Frontend and backend have to be separate, use a docker container for the backend and one for the frontend and one for the database

1. **FRONTEND** use VUE, VUETIFY and more plugins if needed
2. **BACKEND** use NODEJS and EXPRESS for REST API 
3. **DATA** use MongoDB for the data

Keep the user interface simple and clean, with a good aspect, soft colors. 
Separe the backedn in different files, keep code simple to read and consider quality of the code generale rules. 

## 2. Data structures

1. **Person**: is a worker of the company and have: 
{
    name: String, 
    surname: String, 
    email: String, 
    mobile: String, 
    tyep: String (ex. EMP, EXT), 
    department: String, 
    hoursPerDayOfTheWeek: [0,8,8,8,6,0,0,8] }

2. **Customer**: is a person who is a customer or is potential one: 
{ name: String, surname: String, note: String }

3. **Departments**: Area of the company to set 
{ code: String, name: String  }  example:(PROD, PRODUZIONE)

4. **Todo**: is a todolist, but with nested todo stuff and also list of check of work done
{
    title: String,
    order: ObjectId, customer: String,
    !!ADD DATA FROM TODOTEMPLATE CHOSEN WHEN CREATED!!
}
5. **TodoTemplate**: is a todolist, but with nested todo stuff and also list of check of work done
{
    title: String,
    subTodos: [ {
        description: String, 
        checks: [{ name: String, emailNootification: boolean }]
        assignedTo: ObjectId(Person)
        assignedToName: String
    }],
    status: [ { name: String, changeDate: Date } ]
}


6. **Order**: is a specific work instance, 
{ 
    code: String, 
    customer: String, 
    status: [ { name: String, changeDate: Date } ], 
    dueDate: Date ,
    estimateHours: Number, 
    mediumTermPlan: boolean,  
    !!HERE DATA COPIED FROM OrderTemaplate!! 
} 

7. **OrderTemplate**: is a template to appay to Order, is copied: 
{   
    stage: [
        { name: String, department: String  , percentageOfWork: Number, startDate: Date, dueDate: Date, estimateHours: Number , orderBy: Number } 
        ]   
} 

8. **AssignWork**: is the low level details what to do for persons: 
{ 
    person: ObjectID, personName: String , dayDate: Date, 
    order: ObjectId, customer: String, note: String , 
    slotAssigned: [0,0,1,1], notPresent 
} 

9. **Status**: is just the status possibile for Order and/or Quotation 
{ name: String, enableInOrder: bollean, enableInQuotation: boolean }


## 2. Manage the data (example of use)
1. Divide each part in different page and create a menu to navigate the different parts
2. For each data structure make a classic CRUD operation in backend and frontend.
3. When a new ORDER is create, you can chose an OrderTemplate and the data from that order template are copied in the new order.
4. so the Order define long term planing, and is possibile to see in a month calendar, which present the sum of work hours of all people internal (as production capacity for each mmonth) 




## 3. Real context, content we will mange with this software

### 2.1 Stages and substages process/worklow

1. **New cpotential customer** 
    1. ***Discussion*** - Meet a new potential customer, and talk about the possibility to do sometthing
    2. ***MakeMaking a quotation*** - Doing a quotation, the customer wait for it
    3. ***Sent wait approval*** - Waiting for customer accpetance
2. **Order/Stage Project** 
    1. **Rilievi** - Go on building of the customer and collect information
    2. **Progettazione/Discussione** - Create a draw of the proposal and discuss about it and make changes
    3. **Esecutivi** - Draw the final technical specific objects
3. **Order/Stage production** 
    1. **IMOS** - Convert draw in operating description files and data
    2. **Produzione** - Create phisically the goods
4. **Order/Stage build** 
    1. ***Montaggio*** - Create the goods in the customer place
    2. ***Completamenti*** - After finish sometimes the customer need some minor adjustment 

### 3.2 Person which is working on the company

- **Progettazione**: 5 person internal 
- **Produzione**: 12 internal person in laboratory
- **Montaggio**: 5-6 internal person + variability from 0 to 10 person external to mount stuff on the customer place



