// Seeding the Database with Challenges (under 'How to Get Started' in README):

// 1. In your Terminal, navigate to the server/ directory.
// 2. Enter the mongo shell by typing 'mongo' and hitting enter.
// 3. Create or switch to the database that you wish to use with Homerow Apollo with the ```use``` command (for example, ```use apollo```).
// 4. Seed the database with the challenges by entering the following: ```load('seedBatch.js')```
// 5. Exit the mongo shell with ctrl+c
// 6. Run the server and open the browser to localhost:8080

db.challenges.insert([
  {
    "content": "'Hello ' + 'world!';",
    "timeLimit": 90
  },{
    "content": "'a' < 'b';",
    "timeLimit": 90
  }, {
    "content": "'5' === 5;",
    "timeLimit": 90
  }, {
    "content": "null === undefined;",
    "timeLimit": 90
  }, {
    "content": "13 + !0;",
    "timeLimit": 90
  }, {
    "content": "'This is a string'.charAt(0);",
    "timeLimit": 90
  }, {
    "content": "'Hello world'.substring(0, 5);",
    "timeLimit": 90
  }, {
    "content": "'Hello'.length;",
    "timeLimit": 90
  }, {
    "content": "var someVar = 5;",
    "timeLimit": 90
  }, {
    "content": "someOtherVar = 10;",
    "timeLimit": 90
  }, {
    "content": "var someThirdVar;",
    "timeLimit": 90
  }, {
    "content": "someVar += 5;",
    "timeLimit": 90
  }, {
    "content": "someVar *= 10;",
    "timeLimit": 90
  }, {
    "content": "someVar++;",
    "timeLimit": 90
  }, {
    "content": "someVar--;",
    "timeLimit": 90
  }, {
    "content": "var myArray = ['Hello', 45, true];",
    "timeLimit": 90
  }, {
    "content": "myArray[1];",
    "timeLimit": 90
  }, {
    "content": "myArray.push('World');",
    "timeLimit": 90
  }, {
    "content": "myArray.length;",
    "timeLimit": 90
  }, {
    "content": "myArray[3] = 'Hello';",
    "timeLimit": 90
  }
]);
