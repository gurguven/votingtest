const Voting = artifacts.require("./Voting.sol");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("Voting", accounts => {
  // ACCOUNTS 
  const owner = accounts[0]; 
  const user1 = accounts[1]; 
  const user2 = accounts[2]; 
  const user3 = accounts[3]; 
  const user4 = accounts[4]; 
  const user5 = accounts[5]; 
  const nonUser = accounts[6]; 

  // Declaration of the instance of the contract
  let votingInstance; 

  // Setup of differents status of the contract
  async function setupState(status) {
    // The votingInstance refer to a new version of the contract deployed by the owner(account(0))
    votingInstance = await Voting.new({ from: owner });

    // At this phase, no interaction is needed
    if (status == Voting.WorkflowStatus.RegisteringVoters) {
      return;
    }

    // At this phase, we are adding multiple address as voters
    await votingInstance.addVoter(user1);
    await votingInstance.addVoter(user2);
    await votingInstance.addVoter(user3);
    await votingInstance.addVoter(user4);
    await votingInstance.addVoter(user5);
    // Change of status : 
    await votingInstance.startProposalsRegistering();
    if (status == Voting.WorkflowStatus.ProposalsRegistrationStarted) {
      return;
    }
    // At this phase, we are adding multiple proposals by the voters
    const prop1 = "first proposition";
    const prop2 = "second proposition";
    const prop3 = "third proposition";
    await votingInstance.addProposal(prop1, { from: user1 });
    await votingInstance.addProposal(prop2, { from: user2 });
    await votingInstance.addProposal(prop3, { from: user3 });
    // Change of status : 
    await votingInstance.endProposalsRegistering();
    if (status == Voting.WorkflowStatus.ProposalsRegistrationEnded) {
      return;
    }
    // Change of status : 
    await votingInstance.startVotingSession();
    if (status == Voting.WorkflowStatus.VotingSessionStarted) {
      return;
    }
  }

  // :::::::::: TESTING REGISTRATION (addVoter) :::::::::: //
  context("Testing Registration of the Voters: addVoter()", function() {
    beforeEach(async () => {
      await setupState(Voting.WorkflowStatus.RegisteringVoters);
    });

    // REQUIRES // 
    it("...should only authorize the owner to register voters", async () => {
      await expectRevert(
        votingInstance.addVoter(user1, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });
    it("...should require that the status is RegisteringVoters", async () => {
      await votingInstance.startProposalsRegistering();
      await expectRevert(
        votingInstance.addVoter(user1, { from: owner }),
        "Voters registration is not open yet"
      );
    });
    it("...should refuse to register same address twice", async () => {
      await votingInstance.addVoter(user1, { from: owner }); 
      await expectRevert (
        votingInstance.addVoter(user1, { from: owner }),
        "Already registered"
      );
    });

    // MAPPING //
    it("...should register a new voter", async () => {
      await votingInstance.addVoter(user1, { from: owner });
      const voter = await votingInstance.getVoter(user1, { from: user1 });
      expect(voter.isRegistered);
    });

    // EVENT //
    it("...should emit a event with the address of the added voter", async () => {
      const event = await votingInstance.addVoter(user1, {from: owner}); 
      expectEvent(event, "VoterRegistered", {voterAddress: user1} )
    });
  })

  // :::::::::: TESTING GETTERS (getVoter & getOneProposal) :::::::::: //
  context("Testing the Getters", function() {
    describe("Testing getter : getVoter()", function() { 
      beforeEach(async () => {
        await setupState(Voting.WorkflowStatus.RegisteringVoters);
      });
      it("...should return true if a voter is registered", async () => {
        await votingInstance.addVoter(user1, { from: owner });
        const voter = await votingInstance.getVoter(user1, { from: user1 });
        expect(voter.isRegistered).to.be.true;
      });
      it("...should return false if a voter is not registered", async () => {
        await votingInstance.addVoter(owner, { from: owner });
        const voter = await votingInstance.getVoter(user1, { from: owner });
        expect(voter.isRegistered).to.be.false;
      });
    })

    describe("Testing getter : getOneProposal()", function() {
      before(async () => {
        await setupState(Voting.WorkflowStatus.ProposalsRegistrationEnded);
      });
      it("...should get the right proposal in index", async () => {
        const _desc = "first proposition"
        const getterProposal = await votingInstance.getOneProposal(1, {from: user1}); 
        expect(getterProposal.description).to.be.equal(_desc)
      });
    })

  })

  // :::::::::: TESTING PROPOSALS (addProposal) :::::::::: //
  context("Testing Registrations of the Proposals: addProposal()", function() {
    beforeEach(async () => {
      await setupState(Voting.WorkflowStatus.ProposalsRegistrationStarted);
    });

    // REQUIRES //
    it("...should only authorize voters to register a proposal", async () => {
      await expectRevert(
        votingInstance.addProposal("description", {
          from: nonUser,
        }),
        "You're not a voter"
      );
    });
    it("...should require that the status is ProposalsRegistrationStarted", async () => {
      await votingInstance.endProposalsRegistering();
      await expectRevert(
        votingInstance.addProposal("description", { from: user1 }),
        "Proposals are not allowed yet"
      );
    });
    it("...should refuse an empty proposal", async () => {
      await expectRevert(
        votingInstance.addProposal("", {
          from: user1,
        }),
        "Vous ne pouvez pas ne rien proposer"
      );
    });

    // PROPOSAL PUSH IN ARRAY // 
    it("...should register a proposal from a registered voter", async () => {
      const _desc = "proposal description"; 
      await votingInstance.addProposal(_desc, { from: user1 });
      const proposal = await votingInstance.getOneProposal(1, { from: user1 });
      expect(proposal.description).to.be.equal(_desc);
    });

    // EVENT // 
    it("...should emit an event when a proposal is registered", async () => {
      const event = await votingInstance.addProposal("proposal description", {
        from: user2,
      });
      expectEvent(event, "ProposalRegistered", { proposalId: new BN(1) });
      const event2 = await votingInstance.addProposal("proposal description 2", {
        from: user2,
      });
      expectEvent(event2, "ProposalRegistered", { proposalId: new BN(2) });
    });
  })  

  // :::::::::: TESTING VOTING (setVote) :::::::::: //
  context("Testing Voting: setVote()", function() {
    beforeEach(async () => {
      await setupState(Voting.WorkflowStatus.VotingSessionStarted);
    });

    // REQUIRES // 
    it("...should only authorize voters to register a vote", async () => {
      await expectRevert(
        votingInstance.setVote(1, { from: nonUser }),
        "You're not a voter"
      );
    });
    it("...should require that the status is VotingSessionStarted", async () => {
      await votingInstance.endVotingSession();
      await expectRevert(
        votingInstance.setVote(1, { from: user1 }),
        "Voting session havent started yet"
      );
    });
    it("...should require that the voter cannot vote twice", async () => {
      await votingInstance.setVote(1, { from: user1 })
      await expectRevert(
        votingInstance.setVote(2, { from: user1 }),
        "You have already voted"
      );
    });
    it("...should require that the voted proposal does exists", async () => {
      await expectRevert(
        votingInstance.setVote(15, { from: user2 }),
        "Proposal not found"
      );
    });

    // MAPPING //
    it("...should update the votedProposalId of the voter", async () => {
      await votingInstance.setVote(new BN(1), { from: user1 });
      const proposal = await votingInstance.getOneProposal(1, { from: user1 });
      expect(BN(proposal.voteCount)).to.be.bignumber.equal(new BN(1));
    });
    it("...should register that the voter has voted", async () => {
      await votingInstance.setVote(new BN(1), { from: user1 });
      const voter = await votingInstance.getVoter(user1, { from: user2 });
      expect(voter.hasVoted); 
    });
    
    // ARRAY //
    it("...should register a vote", async () => {
      await votingInstance.setVote(new BN(1), { from: user1 });
      await votingInstance.setVote(new BN(1), { from: user2 });
      const proposal = await votingInstance.getOneProposal(1, { from: user1 });
      expect(new BN(proposal.voteCount)).to.be.bignumber.equal(new BN(2));
    });
    
    // EVENTS // 
    it("..should emit an event after a vote is registered", async () => {
      const event = await votingInstance.setVote(1, { from: user2 });
      expectEvent(event, "Voted", { voter: user2, proposalId: new BN(1) });
    });
  }); 

  // :::::::::: TESTING STATES :::::::::: // 
  // (startProposalsRegistering, endProposalsRegistering, startVotingSession, endVotingSession)
  context("Testing Status changes", function() {
    describe("Testing status change : startProposalsRegistering()", function() {
      beforeEach(async () => {
        await setupState(Voting.WorkflowStatus.RegisteringVoters);
      });

      // REQUIRES // 
      it("...should only authorize the owner to change the WorkFlowStatus", async () => {
        await expectRevert(
          votingInstance.startProposalsRegistering({ from: user4 }),
          "Ownable: caller is not the owner"
        );
      });
      it("...should require that the status is RegisteringVoters", async () => {
        await setupState(Voting.WorkflowStatus.VotingSessionStarted);
        await expectRevert(
          votingInstance.startProposalsRegistering({ from: owner }),
          "Registering proposals cant be started now"
        );
      });
      it("...should change the status to is ProposalsRegistrationStarted()", async () => {
        await votingInstance.startProposalsRegistering({ from: owner }); 
        expect(await votingInstance.workflowStatus()).to.be.bignumber.equal(new BN(1));
      });

      // ARRAY // 
      it("...should create a Genesis proposal", async () => {
        await votingInstance.addVoter(user1, {from: owner})
        await votingInstance.startProposalsRegistering();
        const getterProposal = await votingInstance.getOneProposal(0, {from: user1}); 
        expect(getterProposal.description).to.be.equal("GENESIS")
      });

      // EVENTS // 
      it("...should emit an event when changing the status", async () => {
        const event = await votingInstance.startProposalsRegistering();
        expectEvent(event, "WorkflowStatusChange", {
          previousStatus: BN(Voting.WorkflowStatus.RegisteringVoters),
          newStatus: BN(Voting.WorkflowStatus.ProposalsRegistrationStarted),
        });
      });
    })

    // endProposalsRegistering()
    describe("Testing status change : endProposalsRegistering()", function() {
      beforeEach(async () => {
        await setupState(Voting.WorkflowStatus.RegisteringVoters);
      });

      // REQUIRES // 
      it("...should only authorize the owner to change the WorkFlowStatus", async () => {
        await expectRevert(
          votingInstance.endProposalsRegistering({ from: user4 }),
          "Ownable: caller is not the owner"
        );
      });
      it("...should require that the status is ProposalsRegistrationsStarted", async () => {
        await expectRevert(
          votingInstance.endProposalsRegistering({ from: owner }),
          "Registering proposals havent started yet"
        );
      });
      it("...should change the status to is ProposalsRegistrationEnded", async () => {
        await votingInstance.startProposalsRegistering({ from: owner }); 
        await votingInstance.endProposalsRegistering({ from: owner }); 
        expect(await votingInstance.workflowStatus()).to.be.bignumber.equal(new BN(2));
      });

      // EVENTS // 
      it("...should emit an event when changing the status", async () => {
        await votingInstance.startProposalsRegistering({ from: owner }); 
        const event = await votingInstance.endProposalsRegistering();
        expectEvent(event, "WorkflowStatusChange", {
        previousStatus: BN(Voting.WorkflowStatus.ProposalsRegistrationStarted),
        newStatus: BN(Voting.WorkflowStatus.ProposalsRegistrationEnded)
        });
      });
    })

    // startVotingSession()
    describe("Testing status change : startVotingSession()", function() {
      beforeEach(async () => {
        await setupState(Voting.WorkflowStatus.ProposalsRegistrationStarted);
      });
      // REQUIRES // 
      it("...should only authorize the owner to change the WorkFlowStatus", async () => {
        await expectRevert(
          votingInstance.startVotingSession({ from: user4 }),
          "Ownable: caller is not the owner"
        );
      });

      it("...should require that the status is ProposalsRegistrationsEnded", async () => {
        await expectRevert(
          votingInstance.startVotingSession({ from: owner }),
          "Registering proposals phase is not finished"
        );
      });

      // ENUM CHANGE //
      it("...should change the status to startVotingSession", async () => {
        await votingInstance.endProposalsRegistering({from: owner});
        await votingInstance.startVotingSession({ from: owner }); 
        expect(await votingInstance.workflowStatus()).to.be.bignumber.equal(new BN(3));
      });

      // EVENTS // 
      it("...should emit an event when changing the status", async () => {
        await votingInstance.endProposalsRegistering({from: owner});
        const event = await votingInstance.startVotingSession();
        expectEvent(event, "WorkflowStatusChange", {
          previousStatus: BN(Voting.WorkflowStatus.ProposalsRegistrationEnded),
          newStatus: BN(Voting.WorkflowStatus.VotingSessionStarted)
        });
      });
    })

    // endVotingSession()
    describe("Testing status change : endVotingSession()", function() {
      beforeEach(async () => {
        // setup le bon status !!!
        await setupState(Voting.WorkflowStatus.ProposalsRegistrationStarted);
        await votingInstance.endProposalsRegistering({ from: owner });
      });

      // REQUIRES // 
      it("...should only authorize the owner to change the WorkFlowStatus", async () => {
        await expectRevert(
          votingInstance.endVotingSession({ from: user2}),
          "Ownable: caller is not the owner" 
        );
      });
      it("...should require that the status is VotingSessionStarted", async () => {
        await expectRevert(
          votingInstance.endVotingSession({ from: owner }),
          "Voting session havent started yet"
        );
      });

      // ENUM CHANGE //
      it("...should change the status to VotingSessionEnded", async () => {
        await votingInstance.startVotingSession({ from: owner });
        await votingInstance.endVotingSession({ from: owner });
        expect(await votingInstance.workflowStatus()).to.be.bignumber.equal(new BN(4));
      });

      // EVENTS // 
      it("...should emit an event when changing the status", async () => {
        await votingInstance.startVotingSession({ from: owner });
        const event = await votingInstance.endVotingSession();
        expectEvent(event, "WorkflowStatusChange", {
          previousStatus: BN(Voting.WorkflowStatus.VotingSessionStarted),
          newStatus: BN(Voting.WorkflowStatus.VotingSessionEnded)
        });
      });
    })

  })

  // :::::::::: TESTING TALLYING (tallyVotes) :::::::::: // 
  context("Testing Votes Tallying: tallyVotes()", function() {
    beforeEach(async () => {
      await setupState(Voting.WorkflowStatus.ProposalsRegistrationEnded);
      await votingInstance.startVotingSession({ from: owner });
    });

    // REQUIRES // 
    it("...should only authorize the owner to tally votes", async () => {
      await expectRevert(
        votingInstance.tallyVotes({ from: user5 }),
        "Ownable: caller is not the owner"
      );
    });
    it("...should require that the status is VotingSessionEnded", async () => {
      await expectRevert(
        votingInstance.tallyVotes(),
        "Current status is not voting session ended"
      )
    });

    // ENUM CHANGE //
    it("...should change the status to VotesTallied", async () => {
      await votingInstance.endVotingSession({ from: owner });
      await votingInstance.tallyVotes({ from: owner });
      expect(await votingInstance.workflowStatus()).to.be.bignumber.equal(new BN(5));
    });

    // ARRAY // 
    it("...should have proposal 2 as the winning", async () => {
      await votingInstance.setVote(0, { from: user1 });
      await votingInstance.setVote(2, { from: user2 });
      await votingInstance.setVote(2, { from: user3 });
      await votingInstance.setVote(2, { from: user4 });
      await votingInstance.setVote(1, { from: user5 });
      await votingInstance.endVotingSession({ from: owner });
      await votingInstance.tallyVotes();
      const winningProposal = await votingInstance.winningProposalID.call();
      expect(new BN(winningProposal)).to.be.bignumber.equal(new BN(2));
    });

    // EVENTS // 
    it("...should emit an event when changing the status", async () => {
      await votingInstance.endVotingSession({ from: owner });
      const event = await votingInstance.tallyVotes();
      expectEvent(event, "WorkflowStatusChange", { 
        previousStatus: BN(Voting.WorkflowStatus.VotingSessionEnded),
        newStatus: BN(Voting.WorkflowStatus.VotesTallied)
      });
    });
  })
});
 