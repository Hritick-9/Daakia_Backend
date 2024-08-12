import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachments } from "../controllers/chat.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { addMemberValidator, chatIdValidator, newGroupValidator, removeMemberValidator, renameValidator, sendAttachmentsValidator, validateHandler } from "../lib/validators.js";

const router = express.Router();
router.use(isAuthenticated);



router.post("/new",newGroupValidator(),validateHandler, newGroupChat);

router.get("/my",getMyChats);

router.get("/my/groups",getMyGroups);

router.put("/addmembers",addMemberValidator(),validateHandler,addMembers);

router.put("/removemember",removeMemberValidator(),validateHandler,removeMember);

router.delete("/leave/:id",chatIdValidator(),validateHandler,leaveGroup);

router.post("/message",attachmentsMulter,sendAttachmentsValidator(),validateHandler,sendAttachments);

router.get("/message/:id",chatIdValidator(),validateHandler,getMessages)

router.route("/:id")
.get(chatIdValidator(),validateHandler,getChatDetails)
.put(renameValidator(),validateHandler,renameGroup)
.delete(chatIdValidator(),validateHandler,deleteChat);

export default router;
