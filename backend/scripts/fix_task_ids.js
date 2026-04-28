require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');

async function fixTaskIds() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Fix all existing TASK- prefixed IDs to TSK-
  const tasks = await Task.find({ taskId: { $regex: /^TASK-/ } });
  
  let fixed = 0;
  for (const task of tasks) {
    // For auto-generated tasks: TASK-RRR-SF-2026-0001-XXXX -> TSK-RRR-SF-2026-0001-001
    // For manual tasks: TASK-001 -> TSK-MAN-001
    let newId;
    
    if (task.caseId && task.taskId.includes(task.caseId)) {
      // Auto-generated task linked to a case
      // Count how many tasks this case already has (for sequential numbering)
      const caseTaskCount = await Task.countDocuments({ 
        caseId: task.caseId, 
        taskId: { $regex: /^TSK-/ } 
      });
      const seq = caseTaskCount + 1;
      newId = `TSK-${task.caseId}-${String(seq).padStart(3, '0')}`;
    } else if (task.caseId) {
      // Manual task linked to a case
      const caseTaskCount = await Task.countDocuments({ 
        caseId: task.caseId, 
        taskId: { $regex: /^TSK-/ } 
      });
      const seq = caseTaskCount + 1;
      newId = `TSK-${task.caseId}-${String(seq).padStart(3, '0')}`;
    } else {
      // Manual task without case
      const manualCount = await Task.countDocuments({ 
        taskId: { $regex: /^TSK-MAN-/ } 
      });
      const seq = manualCount + 1;
      newId = `TSK-MAN-${String(seq).padStart(3, '0')}`;
    }
    
    await Task.updateOne({ _id: task._id }, { $set: { taskId: newId } });
    console.log(`Fixed: ${task.taskId} -> ${newId}`);
    fixed++;
  }
  
  console.log(`\nTotal fixed: ${fixed} task records`);
  
  // Show all current tasks
  const all = await Task.find().sort({ _id: -1 }).limit(10);
  console.log('\nLatest tasks:');
  all.forEach(t => console.log(`  taskId: ${t.taskId} | caseId: ${t.caseId} | title: ${t.title}`));
  
  await mongoose.disconnect();
}

fixTaskIds().catch(console.error);
