# TESTS UNITAIRES DU CONTRAT "VOTING.SOL"

## Sommaire
- Dépendances & outils utilisés
- Utilisation
- Explication du contrat Voting.sol
- Contenu des tests
- Rapport de gas

---

## Dépendances & outils utilisés
**Afin de réaliser nos tests unitaires, différents outils & packages ont été utilisés :**
- Truffle, un framework de déploiement de contrat solidity, c'est l'environnement qui va permettre de compiler notre contrat et d'effectuer nos tests
- BN(), provenant de la librarie OpenZeppelin test-helpers, permet de convertir les nombres du solidity (256bits) au format JS
- expectRevert(), provenant de la librarie OpenZeppelin test-helpers, permet d'observer les revert de fonctions
- expectEvent(), provenant de la librarie OpenZeppelin test-helpers, permet d'observer et vérifier le bon fonctionnement d'un emit d'un event
- Mocha, intégré à Truffe, est un framework de test
- Chai, est une librairie d'assertion. Elle nous permet d'attendre des valeurs via expect()
- ETH Gas Reporter, permet d'avoir un rapport du gas consommé à l'utilisation des fonctions d'un smart contrat Ethereum.  
 
--- 

## Utilisation 
(*avec [Truffle](https://trufflesuite.com/docs/truffle/) & [Ganache](https://trufflesuite.com/docs/ganache/) et [@openzeppelin/contracts](https://www.npmjs.com/package/@openzeppelin/contracts) au préalable d'installé*)

1. `npm install @openzeppelin/test-helpers`
2. `npm install eth-gas-reporter`
3. `ganache`
4. `truffle compile` 
5. `truffle test`
---

## Explication du contrat Voting.sol

**Le contrat voting.sol comporte 10 fonctions :**
### GETTERS : 
- *getVoter()*, permettant d'obtenir les informations disponibles d'un voteur par son adresse ethereum
- *getOneProposal()*, permettant d'obtenir une proposition via son index
### REGISTRATION : 
- *addVoter()*, permettant à l'owner d'ajouter un voteur à une liste blanche via son adresse ethereum
### PROPOSAL : 
- *addProposal()*, permettant aux voteurs d'enregistrer des propositions
### VOTE : 
- *setVote()*, permettant aux voteurs de voter pour leur proposition préférée 
### STATE : 
- *startProposalsRegistering()*, permettant à l'owner d'ouvrir la session d'enregistrement des propositions
- *endProposalsRegistering*, permettant à l'owner de fermer la session d'enregistrement des propositions
- *startVotingSession()*, permettant à l'owner d'ouvrir la session d'enregistrement des votes
- *endVotingSession()*, permettant à l'owner de fermer la session d'enregistrement des propositions
- *tallyVotes()*, permettant à l'owner d'ouvrir de comptabiliser les votes et déterminer la proposition gagnante

Ce contrat permet donc de réaliser une session de vote accessible à toute personne enregistée sur liste blanche, et dont les phases sont gérables uniquement par le déployeur du contrat. 


## Contenu des tests 

[votingtest.js](https://github.com/gurguven/votingtest/blob/main/test/votingtest.js)

### Les 43 tests unitaires de notre fichier votingtest.js couvrent l'intégralité des fonctions de notre contrat. Ils vérifient le bon fonctionnement : 
- des require et de leur revert
- de la restriction d'utilisation des fonctions réservées aux utilisateurs autorisés
- de la validité de valeurs attendues
- de la gestion d'éventuelles erreurs non désirées 
- du calcul qui détermine la proposition gagnante
- de la gestion du Workflow
- la bonne émission des évènements

### **Organisation :**
Nos différents tests unitaires sont organisés dans un bloc contract() : il prend en paramètre un nom que l'on donne à notre Test, et des accounts, qui dans notre cas proviennent de ganache.

Dans ce bloc on y trouve 6 différents blocs "context()"
Chacun de ces blocs correspondent à une fonction ou à un type de fonction. 
Lorsque un bloc context contient plusieurs fonctions, celle-ci sont organisées à l'intérieur dans un bloc describe. 
Chacun des tests s'établit dans les notations "it()"

### **Détails supplémentaires**

Afin de faciliter l'exécution et la compréhension des tests unitaires, la fonction setupState() permet de simuler l'état d'une phase de vote plus rapidement. 
Dans la plupart des blocs, des "hooks", before ou beforeEach sont utilisés. Ils permettent de définir un environnement unique aux tests qui sont dans le même bloc, juste avant leur exécution. 
Dans notre cas cela nous permet de lancer la fonction setupState afin d'établir des bases à nos tests. 


 ### **Passons en revue l'utilité de chacun de nos blocs :**

### *1. context("Testing Registration of the Voters: addVoter()")*
Ce bloc context vérifie le bon fonctionnement de la fonction *addVoter()*.

Les tests vérifient l'ensemble de ses fonctionnalités : 
- Elle n'est exécutable que par l'owner du contrat
- Elle exige que le statut de la session soit RegisteringVoters 
- Elle exige que la même adresse ne puisse pas être ajoutée 2 fois
- Elle ajoute à un mapping une adresse ethereum et l'associe à une struct (Voter)
- Elle emet un événement qui contient l'adresse du voteur ajouté

### *2. context("Testing the Getters")*
Ce bloc context vérifie le bon fonctionnement de 2 fonctions *getVoter() & getOneProposal()*.

Les tests vérifient le bon fonctionnement de getVoter()
- Elle renvoie des informations d'une structure voter pour une adresse ethereum

Dans nos tests, on vérifie alors que lorsqu'un voteur est enregistré, son booléen isRegistered est passé à true, et qu'un voteur non enregistré a comme valeur false. 

Les tests vérifient aussi le bon fonctionnement de getOneProposal()
- Elle renvoie une proposal en fonction de l'index précisé en paramètre

Dans notre test, il est alors vérifié que lorsqu'une proposition est faite, elle est bien égale à la valeur attendue (au bon index). 

### *3. context("Testing Registrations of the Proposals: addProposal()")*
Ce bloc context permet de vérifier le bon enregistrement des propositions via la fonction addProposal()
Les tests vérifient l'ensemble de ses fonctionnalités : 
- Elle push dans un tableau la proposition effectuée
- Elle exige que le statut actif de session soit ProposalsRegistrationStarted
- Elle refuse les propositions vides
- Elle exige que l'exécuteur de la fonction soit bien enregistré en tant que voteur 
- Elle emet un événement qui contient l'adresse du voteur ayant effectué la proposition et l'index de la proposition dans le tableau

### *4. context("Testing Voting: setVote()")*
Ce bloc context permet de vérifier le bon enregistrement d'un vote via la fonction setVote()
Les tests vérifient l'ensemble de ses fonctionnalités : 
- Elle autorise seulement les voteurs à enregistrer leur vote
- Elle exige que le statut soit VotingSessionStarted
- Elle exige que le voteur ne peut pas voter 2 fois
- Elle vérifie que la proposition précisé en paramètre existe bien
- Elle met à jour le votedProposalId du voteur, par l'index pour laquelle il a souhaité voté 
- Elle met à jour le booléen hasVoted du voteur et le fait passer à true
- Elle emet un event composé de l'adresse du voteur et de la proposition pour laquelle il a voté

### *5. context(Testing Status Changes)*
Ce bloc vérifie le bon fonctionnement de 4 fonctions : startProposalsRegistering, endProposalsRegistering, startVotingSession, endVotingSession

Elles ont en point commun beaucoup de fonctionnalités : 
- Elles exigent d'être exécutées par l'owner du contrat
- Elles exigent que le statut actif est le précédent à celui qui souhaite être activé 
- Elles changent le WorkflowStatus au suivant après l'actuel statut
- Elles émettent un événement comprenant le statut précédent et le nouveau statut actif 

De plus, la fonction startProposalsRegistering, a comme fonctionnalité supplémentaire de créer automatiquent une proposition "GENESIS", à l'index 0. 

Les tests de ce bloc couvrent l'entiéreté des fonctionnalités de ces fonctions.

### *6. context("Tallying Votes")* 
Ce bloc vérifie le bon fonctionnement de la comptabilisation des votes et de la détermination de la gagnate via la fonction tallyVotes. 
Cette fonction termine aussi la session, et change donc le statut actif. C'est pour cela qu'elle a aussi les mêmes fonctionnalités que les fonctions du bloc context précédent. 
Sa fonctionnalité principale :  
- Elle passe en revue les propositions et leurs votes pour déterminer une winningProposal

Le test en quesion vérifie donc que la proposition avec le plus de voies 
l'emporte. 

## Rapport de gas 

Eth Gas Reporter, nous permet d'avoir un rapport des gas utilisés à l'exécutions des fonctions de notre contrat.

Voici le rapport récupéré après la validation de nos 43 tests unitaires


![ETH GAS REPORT](https://i.imgur.com/1T0nWY1.png)





