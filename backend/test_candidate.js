import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import Election from './models/Election.js';
import Candidate from './models/Candidate.js';
import CandidateApplication from './models/CandidateApplication.js';
import { createApplication, editApplication } from './controllers/applicationController.js';
import { approveApplication, rejectApplication } from './controllers/adminController.js';

function mockRes() {
  const res = {};
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.data = data;
    return this;
  };
  return res;
}

function mockReq(overrides = {}) {
  return {
    clerkId: 'test_clerk_id_123',
    dbUser: { _id: new mongoose.Types.ObjectId() },
    body: {},
    params: {},
    ...overrides
  };
}

async function runTests() {
  console.log("Connecting to Database for Verification...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.");
  
  // Cleanup test artifacts from previous runs if any
  await Election.deleteMany({ title: "TEST_ELECTION_V1" });
  await CandidateApplication.deleteMany({ clerkId: 'test_clerk_id_123' });
  await Candidate.deleteMany({ name: "Test Candidate" });

  try {
    // 1. Create an Upcoming Election
    const start = new Date();
    start.setDate(start.getDate() + 1); // tomorrow
    const end = new Date();
    end.setDate(end.getDate() + 2);

    const election = new Election({
      title: "TEST_ELECTION_V1",
      description: "Testing candidate capabilities",
      startTime: start,
      endTime: end
    });
    await election.save();
    console.log("1. Upcoming election created.");

    // 2. Submit Application (Should Succeed)
    const req1 = mockReq({
       body: {
         electionId: election._id.toString(),
         fullName: "Test Candidate",
         email: "test@candidate.com",
         partyName: "Test Party",
         manifesto: "To pass my tests",
         promises: ["Promise 1", "Promise 2"]
       }
    });
    const res1 = mockRes();
    await createApplication(req1, res1);
    
    if (res1.statusCode !== 201) throw new Error(`Application failed: ${JSON.stringify(res1.data)}`);
    console.log("2. Application submitted successfully (Status 201).");
    const appId = res1.data.application._id.toString();

    // 3. Duplicate Application (Should Fail)
    const req2 = mockReq({
       body: req1.body
    });
    const res2 = mockRes();
    await createApplication(req2, res2);
    if (res2.statusCode !== 400) throw new Error(`Duplicate did not fail appropriately. Code: ${res2.statusCode}`);
    console.log("3. Duplicate application appropriately blocked (Status 400).");

    // 4. Edit Application (Should Succeed)
    const req3 = mockReq({
       params: { id: appId },
       body: {
         manifesto: "Updated manifesto!"
       }
    });
    const res3 = mockRes();
    await editApplication(req3, res3);
    if (res3.statusCode !== 200 || res3.data.application.manifesto !== "Updated manifesto!") {
       throw new Error("Failed to edit application appropriately.");
    }
    console.log("4. Application edited successfully.");

    // 5. Approve Application (Should Succeed and create Candidate)
    const req4 = mockReq({ params: { applicationId: appId } });
    const res4 = mockRes();
    await approveApplication(req4, res4);
    if (res4.statusCode !== 200) throw new Error(`Approval failed: ${JSON.stringify(res4.data)}`);
    console.log("5. Application approved successfully (Status 200).");

    // 6. Verify Creation inside Election
    const updatedElection = await Election.findById(election._id).lean();
    if (updatedElection.candidates.length !== 1) throw new Error("Candidate ID was not injected into the Election array.");
    const createdCandidate = await Candidate.findById(updatedElection.candidates[0]).lean();
    if (!createdCandidate || createdCandidate.manifesto !== "Updated manifesto!") throw new Error("Official Candidate not created or fields did not bridge correctly.");
    console.log("6. Official candidate mapped automatically into Election via approval.");

    // 7. Duplicate Approve (Should Fail since Status is Approved)
    const req5 = mockReq({ params: { applicationId: appId } });
    const res5 = mockRes();
    await approveApplication(req5, res5);
    if (res5.statusCode !== 400) throw new Error(`Duplicate approval should fail to maintain idempotency. Code: ${res5.statusCode}`);
    console.log("7. Duplicate approval successfully blocked.");

    // 8. Reject Approved (Should Fail)
    const req6 = mockReq({ params: { applicationId: appId }, body: { rejectionReason: "Because" } });
    const res6 = mockRes();
    await rejectApplication(req6, res6);
    if (res6.statusCode !== 400) throw new Error(`Rejecting approved should fail. Code: ${res6.statusCode}`);
    console.log("8. Rejecting already-approved blocked successfully.");

    // 9. Ongoing Election Locks
    election.startTime = new Date(Date.now() - 10000); // Shift start to past
    await election.save();
    
    const req7 = mockReq({ params: { id: appId }});
    const res7 = mockRes();
    await editApplication(req7, res7);
    if (res7.statusCode !== 400) throw new Error("Should block edit during Ongoing election. Got: " + res7.statusCode + " with msg: " + JSON.stringify(res7.data));
    console.log("9. Ongoing election strictly locked further operations.");

    console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY.");

  } catch (error) {
    import('fs').then(fs => {
       fs.writeFileSync('error.log', "Test execution encountered an error:\n" + error.stack);
    });
    process.exitCode = 1;
  } finally {
    // Teardown
    await Election.deleteMany({ title: "TEST_ELECTION_V1" });
    await CandidateApplication.deleteMany({ clerkId: 'test_clerk_id_123' });
    await Candidate.deleteMany({ name: "Test Candidate" });
    process.exit(process.exitCode || 0);
  }
}

runTests();
